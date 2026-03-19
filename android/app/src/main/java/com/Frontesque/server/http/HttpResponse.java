package com.Frontesque.server.http;

import com.Frontesque.server.Logger;
import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import org.apache.http.cookie.Cookie;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.DataOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;


/**
 * HttpResponse class defines the HTTP Response Status Line (method, URI, version) 
 * and Headers http://www.w3.org/Protocols/rfc2616/rfc2616-sec6.html
 */
public class HttpResponse {

	private static Logger log = Logger.getLogger(HttpResponse.class);

	public static final String VERSION = "HTTP/1.0";

	List<String> headers = new ArrayList<String>();

	byte[] body;
	public HashMap<String, String> parseFormData(String formData) {
		HashMap<String, String> formDataMap = new HashMap<>();

		// Use regex to dynamically find the boundary
		Pattern pattern = Pattern.compile("--(\\S+)");
		Matcher matcher = pattern.matcher(formData);

		// Find the boundary
		String boundary = null;
		if (matcher.find()) {
			boundary = matcher.group(1);
		}

		if (boundary != null) {
			// Split the form data by the boundary
			String[] parts = formData.split("--" + boundary);

			for (String part : parts) {
				// Extract name and value
				String[] lines = part.trim().split("\n");
				String name = null;
				StringBuilder valueBuilder = new StringBuilder();

				for (String line : lines) {
					if (line.startsWith("Content-Disposition")) {
						int startIndex = line.indexOf("name=\"") + 6;
						int endIndex = line.lastIndexOf("\"");
						name = line.substring(startIndex, endIndex);
					} else if (!line.trim().isEmpty()) {
						valueBuilder.append(line.trim());
					}
				}

				// If name and value are not empty, add to HashMap
				if (name != null && valueBuilder.length() > 0) {
					formDataMap.put(name, valueBuilder.toString());
				}
			}
		}

		return formDataMap;
	}
	public static String getSocsValue(String cookie) {
		String startStr = "SOCS=";
		String endStr = "; Domain";

		int startIndex = cookie.indexOf(startStr) + startStr.length();
		int endIndex = cookie.indexOf(endStr, startIndex);

		if (startIndex != -1 && endIndex != -1) {
			return cookie.substring(startIndex, endIndex).trim();
		} else {
			return "";
		}
	}

	public HttpResponse(HttpRequest req) throws IOException {

		switch (req.method) {
			case HEAD:
				fillHeaders(Status._200);
				break;
			case POST:
				try {
					// Handle POST request here
					// You can access request body and process accordingly
					// For example:
					// Read request body
					String requestBody = String.valueOf(parseFormData(req.body));
					String requestBody2 = String.valueOf(parseFormData(req.body));

					// Process the request body as needed
					// For example, you can parse form data, JSON, etc.
					// Perform necessary operations based on the request

					// Send a successful response
					fillHeaders(Status._200);
					fillResponse("POST request received and processed successfully " + requestBody);


					// Убираем фигурные скобки и пробелы в начале и конце строки
					requestBody = requestBody.substring(1, requestBody.length() - 1).trim();

					// Создаем новый JsonObject
					JsonObject jsonObject = new JsonObject();

					// Разбиваем строку по запятым
					String[] keyValuePairs = requestBody.split(", ");

					// Разбиваем каждую пару ключ-значение и добавляем в JsonObject
					for (String pair : keyValuePairs) {
						String[] keyValue = pair.split("=");
						String key = keyValue[0].trim();
						String value = keyValue[1].trim();

						// Пытаемся распознать тип значения
						if (value.equalsIgnoreCase("true") || value.equalsIgnoreCase("false")) {
							jsonObject.addProperty(key, Boolean.parseBoolean(value));
						} else {
							try {
								jsonObject.addProperty(key, Integer.parseInt(value));
							} catch (NumberFormatException e) {
								jsonObject.addProperty(key, value);
							}
						}
					}

					// Преобразуем JsonObject в строку JSON
					Gson gson = new Gson();
					String jsonString = gson.toJson(jsonObject);

//					if (new JSONObject(jsonString).get("typeOfPost") == "consent") {
					Map<String, List<String>> str = sendPostRequest(jsonObject);
//						str.stream().spliterator().
						for (Map.Entry<String, List<String>> entry : str.entrySet())     {

							String key = entry.getKey();
							String val = entry.getValue().get(0);
							if (Objects.equals(key, "Set-Cookie")) {
								fillResponse(getSocsValue(val));

								headers.add("Set-cookie: SOCS:" + getSocsValue(val) + "; Domain=.youtube.com; Expires=Tue, 29-Jul-2025 14:33:50 GMT; Path=/; Secure; HttpOnly; SameSite=none; Partitioned");
//								fillHeaders("Set-cookie: " + getSocsValue(val));
								break;
							}
							//System.out.printf("%s: %s\n", key, val);
//							fillResponse("key " + key);
//							fillResponse("val " + val);
						}

//					for (Cookie cookie : str) {
////							log.error("Response Error");
//							fillResponse("COOOOOOOOOOOOKIE " + cookie.getName());
//						}
//						fillResponse(Status._400.toString());
//					}





				} catch (Exception e) {
					log.error("Response Error", e);
					fillHeaders(Status._400);
					fillResponse(Status._400.toString());
				}
				break;
			case GET:
				try {
					// TODO fix dir bug http://localhost:8080/src/test
					File file = new File("." + req.uri);
					if (file.isDirectory()) {
					    fillHeaders(Status._200);
					    
						headers.add(ContentType.HTML.toString());
						StringBuilder result = new StringBuilder("<html><head><title>Index of ");
						result.append(req.uri);
						result.append("</title></head><body><h1>Index of ");
						result.append(req.uri);
						result.append("</h1><hr><pre>");

						// TODO add Parent Directory
						File[] files = file.listFiles();
						for (File subfile : files) {
							result.append(" <a href=\"" + subfile.getPath() + "\">" + subfile.getPath() + "</a>\n");
						}
						result.append("<hr></pre></body></html>");
						fillResponse(result.toString());
					} else if (file.exists()) {
					    fillHeaders(Status._200);
						setContentType(req.uri, headers);
						fillResponse(getBytes(file));
					} else {
						log.info("File not found:" + req.uri);
						fillHeaders(Status._404);
						fillResponse(Status._404.toString());
					}
				} catch (Exception e) {
					log.error("Response Error", e);
					fillHeaders(Status._400);
					fillResponse(Status._400.toString());
				}

				break;
			case UNRECOGNIZED:
				fillHeaders(Status._400);
				fillResponse(Status._400.toString());
				break;
			default:
				fillHeaders(Status._501);
				fillResponse(Status._501.toString());
		}

	}
	public static String toQueryString(JsonObject jsonObject) {
		StringBuilder queryString = new StringBuilder();

		for (Map.Entry<String, JsonElement> entry : jsonObject.entrySet()) {
			String key = entry.getKey();
			String value = entry.getValue().getAsString();

			queryString.append(key)
					.append("=")
					.append(encodeValue(value))
					.append("&");
		}

		// Удалить последний символ "&"
		if (queryString.length() > 0) {
			queryString.setLength(queryString.length() - 1);
		}

		return queryString.toString();
	}

	private static String encodeValue(String value) {
		try {
			return java.net.URLEncoder.encode(value, "UTF-8");
		} catch (Exception e) {
			e.printStackTrace();
			return value;
		}
	}


	private Map<String, List<String>> sendPostRequest(JsonObject requestBody) throws IOException {
		String url ="https://consent.youtube.com/save";

		URL obj = new URL(url);
		HttpURLConnection con = (HttpURLConnection) obj.openConnection();
		//HttpURLConnection.setFollowRedirects(true);
		con.setInstanceFollowRedirects(false);  //essential for capturing 302 redirect on successful login

		con.setDoOutput(true);
		con.setRequestMethod("POST");
		con.setRequestProperty("referrer", "https://consent.youtube.com/");
		con.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");

		con.connect();
		String charset = "UTF-8";  // Or in Java 7 and later, use the constant: java.nio.charset.StandardCharsets.UTF_8.name()

// ...

		String query = toQueryString(requestBody);


		OutputStream output = con.getOutputStream();
		output.write(query.getBytes(charset));

		int responseCode = con.getResponseCode();
		String getResponseMessage = con.getResponseMessage();

		System.out.println("PASS=requestBody "+responseCode);

		Map<String, List<String>> map = con.getHeaderFields();
		con.disconnect();
		return map;
	}

	private byte[] getBytes(File file) throws IOException {
		int length = (int) file.length();
		byte[] array = new byte[length];
		InputStream in = new FileInputStream(file);
		int offset = 0;
		while (offset < length) {
			int count = in.read(array, offset, (length - offset));
			offset += count;
		}
		in.close();
		return array;
	}

	private void fillHeaders(Status status) {
		headers.add(HttpResponse.VERSION + " " + status.toString());
		headers.add("Connection: close");
		headers.add("Server: SimpleWebServer");
	}

	private void fillResponse(String response) {
		body = response.getBytes();
	}

	private void fillResponse(byte[] response) {
		body = response;
	}

	public void write(OutputStream os) throws IOException {
		DataOutputStream output = new DataOutputStream(os);
		for (String header : headers) {
			output.writeBytes(header + "\r\n");
		}
		output.writeBytes("\r\n");
		if (body != null) {
			output.write(body);
		}
		output.writeBytes("\r\n");
		output.flush();
	}

	private void setContentType(String uri, List<String> list) {
		try {
			String ext = uri.substring(uri.indexOf(".") + 1);
			list.add(ContentType.valueOf(ext.toUpperCase()).toString());
		} catch (Exception e) {
			log.error("ContentType not found: " + e, e);
		}
	}
}
