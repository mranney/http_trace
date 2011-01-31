## examples/http_trace

This is a handy program that decodes HTTP and WebSocket traffic.  It uses `node_pcap`.  Install it with:

    npm install http_trace

## Usage `http_trace [options]`

    Capture options:
        -i <interface>           interface name for capture (def: first with an addr)
        -f <pcap_filter>         packet filter in pcap-filter(7) syntax (def: all TCP packets)
        -b <buffer>              size in MB to buffer between libpcap and app (def: 10)

    HTTP filtering:
        Filters are OR-ed together and may be specified more than once.
        Show filters are applied first, then ignore filters.
        --method <regex>            show requests with this method
        --method-ignore <regex>     ignore requests with this method
        --host <regex>              show requests with this Host header
        --host-ignore <regex>       ignore requests with this Host header
        --url <regex>               show requests with this URL
        --url-ignore <regex>        ignore requests with this URL
        --user-agent <regex>        show requests with this UA header
        --user-agent-ignore <regex> ignore requests with this UA header

    HTTP output:
        --headers                print headers of request and response (def: off)
        --bodies                 print request and response bodies, if any (def: off)
        --tcp-verbose            display TCP events (def: off)
        --no-color               disable ANSI colors (def: pretty colors on)

    Examples:
        http_trace -f "tcp port 80"
           listen for TCP port 80 on the default device
        http_trace -i eth1 --method POST
           listen on eth1 for all traffic that has an HTTP POST
        http_trace --host ranney --headers
           matches ranney in Host header and prints req/res headers

## Screenshot

![http_trace screenshot](http://ranney.com/httptrace.jpg)


The TCP tracker in `node_pcap` looks for HTTP at the beginning of every TCP connection.
If found, all captured data on this connection will be fed to node's HTTP parser and events will be generated.
`http_trace` has listeners for these events and will print out some helpful information.

If a WebSocket upgrade is detected, `http_trace` will start looking for WebSocket messages on that connection.
