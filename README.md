## examples/http_trace

This is a handy program that decodes HTTP and WebSocket traffic.  It uses `node_pcap`.

The TCP tracker in `node_pcap` looks for HTTP at the beginning of every TCP connection.
If found, all captured on this connection will be fed to node's HTTP parser and events will be generated.
`http_trace` has listeners for these events and will print out some helpful information.

If a WebSocket upgrade is detected, `http_trace` will start looking for WebSocket messages on that connection.

![http_trace screenshot](http://ranney.com/httptrace.jpg)
