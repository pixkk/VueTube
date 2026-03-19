package com.Frontesque.server;

import java.util.logging.ConsoleHandler;
import java.util.logging.Level;

/**
 * Class <code>Logger</code> uses standard java Logger to seamless replace Log4J Logger (and reduce final jar size).
 * To enable Log4J, add log4J dependency in pom.xml and change java clases to import org.apache.log4j.Logger;
 */
public class Logger {

	java.util.logging.Logger logger;

	public Logger(String name) {
		logger = java.util.logging.Logger.getLogger(name);
		logger.setLevel(Level.INFO);
		logger.addHandler(new ConsoleHandler());
	}

	@SuppressWarnings("rawtypes")
	public static Logger getLogger(Class cl) {
		return new Logger(cl.getName());
	}

	public void error(String msg, Throwable thrown) {
		logger.log(Level.SEVERE, msg, thrown);
	}

	public void info(String msg) {
		logger.info(msg);
	}
}
