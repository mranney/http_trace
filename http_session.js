var HTTPParser = process.binding("http_parser").HTTPParser; // magic alert
var EventEmitter = require("events").EventEmitter;
var inherits = require("util").inherits;
var DNSCache = require("pcap").DNSCache;
var dns_cache = new DNSCache();

function HTTPRequest() {
    this.start = null;
    this.headers = {};
    this.url = null;
    this.method = null;
    this.body_len = 0;
    this.http_version = null;
}

function HTTPResponse() {
    this.start = null;
    this.headers = {};
    this.status_code = null;
    this.body_len = 0;
    this.http_version = null;
}

function lookup(host_port) {
    var parts = host_port.split(":");
    return dns_cache.ptr(parts[0]) + ":" + parts[1];
}

// This tracks potentially multiple HTTP requests on a single TCP session
function HTTPSession(tcp_session) {
    this.tcp_session = tcp_session;
    this.request = new HTTPRequest();
    this.response = new HTTPResponse();
    this.request_parser = new HTTPParser(HTTPParser.REQUEST);
    this.response_parser = new HTTPParser(HTTPParser.RESPONSE);
    this.request_count = 0;

    this.tcp_session.src_name = lookup(this.tcp_session.src_name);
    this.tcp_session.dst_name = lookup(this.tcp_session.dst_name);

    var self = this;

    this.request_parser.url = "";
    // since the HTTP parser is a hot path in node, they use functions as properties instead of
    // EventEmitter, which is slightly slower. In order to implement the interface, we need to do the same.
    this.request_parser.onHeaders = function (headers, url) {
        self.on_req_headers(headers, url);
    };
    this.request_parser.onHeadersComplete = function (info) {
        self.on_req_headers_complete(info);
    };
    this.request_parser.onBody = function (buf, start, len) {
        self.on_req_body(buf, start, len);
    };
    this.request_parser.onMessageComplete = function () {
        self.emit("http request complete", self);
    };
    this.response_parser.onHeaders = function (headers) {
        self.on_res_headers(headers);
    };
    this.response_parser.onHeadersComplete = function(info) {
        self.on_res_headers_complete(info);
    };
    this.response_parser.onBody = function (buf, start, len) {
        self.on_res_body(buf, start, len);
    };
    this.response_parser.onMessageComplete = function () {
        self.on_res_complete();
    };
    this.tcp_session.on("data send", function (tcp_session, chunk) {
        self.on_tcp_data_send(chunk);
    });
    this.tcp_session.on("data recv", function (tcp_session, chunk) {
        self.on_tcp_data_recv(chunk);
    });

    EventEmitter.call(this);
}
inherits(HTTPSession, EventEmitter);

HTTPSession.prototype.on_req_headers = function (headers, url) {
    this.request_parser.headers = (this.request_parser.headers || []).concat(headers);
    this.request_parser.url += url;
};

HTTPSession.prototype.on_req_headers_complete = function (info) {
    this.request.method = info.method;
    this.request.url = info.url || this.request_parser.url;
    this.request.http_version = info.versionMajor + "." + info.versionMinor;

    var headers = info.headers || this.request_parser.headers;
    for (var i = 0; i < headers.length; i += 2) {
        this.request.headers[headers[i]] = headers[i + 1];
    }

    this.request_count++;
    this.request.start = Date.now();

    this.emit("http request", this);
};

HTTPSession.prototype.on_req_body = function (buf, start, len) {
    this.request.body_len += len;
    this.emit("http request body", this, buf.slice(start, start + len));
};

HTTPSession.prototype.on_res_headers = function (headers) {
    this.response_parser.headers = (this.response_parser.headers || []).concat(headers);
};

HTTPSession.prototype.on_res_headers_complete = function (info) {
    this.response.status_code = info.statusCode;
    this.response.http_version = info.versionMajor + "." + info.versionMinor;

    var headers = info.headers || this.response_parser.headers;
    for (var i = 0; i < headers.length; i += 2) {
        this.response.headers[headers[i]] = headers[i + 1];
    }

    // old websocket detect code. It would be nice to enable this again with a modern websocket decoder
    //
    // if (this.response.status_code === 101 && this.response.headers.Upgrade === "WebSocket") {
    //     if (this.response.headers["Sec-WebSocket-Location"]) {
    //         self.setup_websocket_tracking(session, "draft76");
    //       } else {
    //         self.setup_websocket_tracking(session);
    //       }
    //       self.emit("websocket upgrade", session, http);
    //       session.http_detect = false;
    //       session.websocket_detect = true;
    //       delete http.response_parser.onMessageComplete;
    // } else {

    this.response.start = Date.now();

    this.emit("http response", this);
};

HTTPSession.prototype.on_res_body = function (buf, start, len) {
    this.response.body_len += len;
    this.emit("http response body", this, buf.slice(start, start + len));
};

HTTPSession.prototype.on_res_complete = function () {
    this.emit("http response complete", this);

    this.request = new HTTPRequest();
    this.response = new HTTPResponse();
};

HTTPSession.prototype.on_tcp_data_send = function (chunk) {
    try {
        this.request_parser.execute(chunk, 0, chunk.length);
    } catch (request_err) {
        this.emit("http error", this, "send", request_err);
    }
    // if we are doing websocket, need to feed data to ws parser instead here
};

HTTPSession.prototype.on_tcp_data_recv = function (chunk) {
    try {
        this.response_parser.execute(chunk, 0, chunk.length);
    } catch (request_err) {
        this.emit("http error", this, "recv", request_err);
    }
    // if we are doing websocket, need to feed data to ws parser instead here
};

module.exports = HTTPSession;
