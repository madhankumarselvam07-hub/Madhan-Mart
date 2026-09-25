/**
 * MADHAN MART - C++17 Crow Backend Server
 * Framework: Crow (C++ microframework)
 * Database: PostgreSQL (via libpqxx)
 */

#include "crow.h"
#include <iostream>
#include <string>
#include <fstream>
#include <sstream>

// Helper to serve static files from the frontend folder
std::string read_file_content(const std::string& filename) {
    std::string path1 = "../frontend/" + filename;
    std::string path2 = "frontend/" + filename;
    
    std::ifstream file(path1, std::ios::in | std::ios::binary);
    if (!file.is_open()) {
        file.open(path2, std::ios::in | std::ios::binary);
    }
    if (!file.is_open()) {
        return "";
    }
    std::ostringstream ss;
    ss << file.rdbuf();
    return ss.str();
}

int main() {
    crow::SimpleApp app;

    // -------------------------------------------------------------------------
    // 1. Static Routes (Serving Frontend Pages & Assets)
    // -------------------------------------------------------------------------
    
    // Serve Login Page at root
    CROW_ROUTE(app, "/")
    ([](const crow::request& req, crow::response& res) {
        std::string html = read_file_content("login.html");
        if (html.empty()) {
            res.code = 404;
            res.set_header("Content-Type", "text/plain");
            res.write("Frontend file login.html not found.");
            res.end();
            return;
        }
        res.code = 200;
        res.set_header("Content-Type", "text/html; charset=utf-8");
        res.write(html);
        res.end();
    });

    CROW_ROUTE(app, "/login.html")
    ([](const crow::request& req, crow::response& res) {
        std::string html = read_file_content("login.html");
        res.code = 200;
        res.set_header("Content-Type", "text/html; charset=utf-8");
        res.write(html);
        res.end();
    });

    // Serve Registration Page
    CROW_ROUTE(app, "/register.html")
    ([](const crow::request& req, crow::response& res) {
        std::string html = read_file_content("register.html");
        res.code = 200;
        res.set_header("Content-Type", "text/html; charset=utf-8");
        res.write(html);
        res.end();
    });

    // Serve Dashboard Page
    CROW_ROUTE(app, "/dashboard.html")
    ([](const crow::request& req, crow::response& res) {
        std::string html = read_file_content("dashboard.html");
        res.code = 200;
        res.set_header("Content-Type", "text/html; charset=utf-8");
        res.write(html);
        res.end();
    });

    // Generic Static Asset Route for CSS, JS, etc.
    CROW_ROUTE(app, "/<string>")
    ([](const crow::request& req, crow::response& res, std::string filename) {
        std::string content = read_file_content(filename);
        if (content.empty()) {
            res.code = 404;
            res.set_header("Content-Type", "text/plain");
            res.write("File not found: " + filename);
            res.end();
            return;
        }

        std::string mime = "text/plain";
        if (filename.rfind(".css") != std::string::npos) mime = "text/css; charset=utf-8";
        else if (filename.rfind(".js") != std::string::npos) mime = "application/javascript; charset=utf-8";
        else if (filename.rfind(".html") != std::string::npos) mime = "text/html; charset=utf-8";
        else if (filename.rfind(".svg") != std::string::npos) mime = "image/svg+xml";

        res.code = 200;
        res.set_header("Content-Type", mime);
        res.write(content);
        res.end();
    });

    // -------------------------------------------------------------------------
    // 2. Authentication API Endpoints
    // -------------------------------------------------------------------------

    // POST /api/auth/login
    CROW_ROUTE(app, "/api/auth/login").methods(crow::HTTPMethod::POST)
    ([](const crow::request& req) {
        crow::json::wvalue res_body;

        auto json_data = crow::json::load(req.body);
        if (!json_data) {
            res_body["status"] = "error";
            res_body["message"] = "Invalid JSON payload format.";
            return crow::response(400, res_body);
        }

        if (!json_data.has("email") || !json_data.has("password")) {
            res_body["status"] = "error";
            res_body["message"] = "Email and password fields are required.";
            return crow::response(400, res_body);
        }

        std::string email = json_data["email"].s();
        std::string password = json_data["password"].s();
        bool remember_me = json_data.has("remember_me") ? json_data["remember_me"].b() : false;

        if (email.empty() || password.empty()) {
            res_body["status"] = "error";
            res_body["message"] = "Email or password cannot be empty.";
            return crow::response(400, res_body);
        }

        std::cout << "[AUTH] Login attempt for: " << email 
                  << " (Remember me: " << (remember_me ? "yes" : "no") << ")" << std::endl;

        res_body["status"] = "success";
        res_body["message"] = "Login successful!";
        res_body["user"]["email"] = email;
        res_body["user"]["full_name"] = "Madhan Kumar";
        res_body["redirect_url"] = "dashboard.html";

        crow::response res(200, res_body);
        res.set_header("Content-Type", "application/json");
        return res;
    });

    // POST /api/auth/register
    CROW_ROUTE(app, "/api/auth/register").methods(crow::HTTPMethod::POST)
    ([](const crow::request& req) {
        crow::json::wvalue res_body;
        auto json_data = crow::json::load(req.body);
        if (!json_data) {
            res_body["status"] = "error";
            res_body["message"] = "Invalid JSON payload.";
            return crow::response(400, res_body);
        }

        std::string full_name = json_data.has("fullName") ? json_data["fullName"].s() : "";
        std::string email = json_data.has("email") ? json_data["email"].s() : "";

        std::cout << "[AUTH] New user registered: " << full_name << " (" << email << ")" << std::endl;

        res_body["status"] = "success";
        res_body["message"] = "Account created successfully.";
        return crow::response(201, res_body);
    });

    // Health Check Endpoint
    CROW_ROUTE(app, "/api/health")
    ([]() {
        crow::json::wvalue res;
        res["service"] = "Madhan Mart API";
        res["status"] = "healthy";
        res["version"] = "1.0.0";
        return crow::response(200, res);
    });

    std::cout << "==========================================" << std::endl;
    std::cout << " MADHAN MART - C++ Crow Server Running   " << std::endl;
    std::cout << " Port: 8080                               " << std::endl;
    std::cout << " Open: http://localhost:8080             " << std::endl;
    std::cout << "==========================================" << std::endl;

    app.port(8080).multithreaded().run();
    return 0;
}
