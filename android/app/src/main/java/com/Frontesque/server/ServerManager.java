package com.Frontesque.server;


import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ServerManager {
    public ServerManager() throws IOException {
//        InetSocketAddress address = new InetSocketAddress(8080);
        ServerSocket serverSocket = new ServerSocket(6789);
        System.out.println("Listening for connections on port 6789...\r\n");
        ExecutorService executor = Executors.newFixedThreadPool(3);
        while (true) {
            executor.submit(new RequestHandler(serverSocket.accept()));
        }

        // Listen for new client connections
//        while(true) {
//
//            // Accept new client connection
//            Socket connectionSocket = serverSocket.accept();
//
//            // Create new thread to handle client request
//            Thread connectionThread = new Thread(new Connection(connectionSocket));
//
//            // Start the connection thread
//            connectionThread.start();
//            System.out.println("New connection on port 6789...\r\n");
//        }
//        new Connection(address);

    }
}
