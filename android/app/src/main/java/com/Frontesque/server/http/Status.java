package com.Frontesque.server.http;

/**
 * Status enum maps the HTTP/1.1 available response status codes 
 * http://www.w3.org/Protocols/rfc2616/rfc2616-sec6.html
 */
public enum Status {
	_100("100 Continue"), //
	_101("101 Switching Protocols"), //
	_200("200 OK"), //
	_201("201 Created"), //
	_202("202 Accepted"), //
	_203("203 Non-Authoritative Information"), //
	_204("204 No Content"), //
	_205("205 Reset Content"), //
	_206("206 Partial Content"), //
	_300("300 Multiple Choices"), //
	_301("301 Moved Permanently"), //
	_302("302 Found"), //
	_303("303 See Other"), //
	_304("304 Not Modified"), //
	_305("305 Use Proxy"), //
	_307("307 Temporary Redirect"), //
	_400("400 Bad Request"), //
	_401("401 Unauthorized"), //
	_402("402 Payment Required"), //
	_403("403 Forbidden"), //
	_404("404 Not Found"), //
	_405("405 Method Not Allowed"), //
	_406("406 Not Acceptable"), //
	_407("407 Proxy Authentication Required"), //
	_408("408 Request Time-out"), //
	_409("409 Conflict"), //
	_410("410 Gone"), //
	_411("411 Length Required"), //
	_412("412 Precondition Failed"), //
	_413("413 Request Entity Too Large"), //
	_414("414 Request-URI Too Large"), //
	_415("415 Unsupported Media Type"), //
	_416("416 Requested range not satisfiable"), //
	_417("417 Expectation Failed"), //
	_500("500 Internal Server Error"), //
	_501("501 Not Implemented"), //
	_502("502 Bad Gateway"), //
	_503("503 Service Unavailable"), //
	_504("504 Gateway Time-out"), //
	_505("505 HTTP Version not supported"); //

	private final String status;

	Status(String status) {
		this.status = status;
	}

	@Override
	public String toString() {
		return status;
	}
}
