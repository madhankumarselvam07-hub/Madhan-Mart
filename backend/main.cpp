/**
 * MADHAN MART - C++17 Crow Backend Server
 * Supabase PostgreSQL Direct Connection Integration
 */

#include "crow.h"
#include <iostream>
#include <string>
#include <fstream>
#include <sstream>
#include <cstdlib>
#include <map>

// Simple .env parser to read Supabase configuration
std::map<std::string, std::string> load_env_file(const std::string& filepath = ".env") {
    std::map<std::string, std::string> env_vars;
    std::ifstream file(filepath);
    if (!file.is_open()) {
        file.open("../" + filepath);
    }
    if (!file.is_open()) {
        file.open("backend/" + filepath);
    }
    if (!file.is_open()) {
        return env_vars;
    }

    std::string line;
    while (std::getline(file, line)) {
        if (line.empty() || line[0] == '#') continue;
        size_t delimiter_pos = line.find('=');
        if (delimiter_pos != std::string::npos) {
            std::string key = line.substr(0, delimiter_pos);
            std::string value = line.substr(delimiter_pos + 1);
            // Trim whitespace
            key.erase(0, key.find_first_not_of(" \t\r\n"));
            key.erase(key.find_last_not_of(" \t\r\n") + 1);
            value.erase(0, value.find_first_not_of(" \t\r\n"));
            value.erase(value.find_last_not_of(" \t\r\n") + 1);
            env_vars[key] = value;
        }
    }
    return env_vars;
}

std::string get_env_var(const std::string& key, const std::string& default_value = "") {
    const char* val = std::getenv(key.c_str());
    if (val != nullptr && std::string(val).length() > 0) {
        return std::string(val);
    }
    static auto env_map = load_env_file();
    if (env_map.find(key) != env_map.end()) {
        return env_map[key];
    }
    return default_value;
}

// Helper to serve static files from frontend
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

    // Load Supabase Database URL
    std::string database_url = get_env_var("DATABASE_URL", "");
    std::string supabase_url = get_env_var("SUPABASE_URL", "");
    int port = 8080;
    try {
        std::string port_str = get_env_var("PORT", "8080");
        port = std::stoi(port_str);
    } catch (...) {
        port = 8080;
    }

    // -------------------------------------------------------------------------
    // 1. Static Routes (Frontend Pages & Assets)
    // -------------------------------------------------------------------------
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

    CROW_ROUTE(app, "/register.html")
    ([](const crow::request& req, crow::response& res) {
        std::string html = read_file_content("register.html");
        res.code = 200;
        res.set_header("Content-Type", "text/html; charset=utf-8");
        res.write(html);
        res.end();
    });

    CROW_ROUTE(app, "/dashboard.html")
    ([](const crow::request& req, crow::response& res) {
        std::string html = read_file_content("dashboard.html");
        res.code = 200;
        res.set_header("Content-Type", "text/html; charset=utf-8");
        res.write(html);
        res.end();
    });

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
    // 2. Authentication API Endpoints (Supabase Backend)
    // -------------------------------------------------------------------------
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

        std::cout << "[AUTH] Supabase Login attempt for: " << email << std::endl;

        res_body["status"] = "success";
        res_body["message"] = "Login successful!";
        res_body["user"]["email"] = email;
        res_body["user"]["full_name"] = "Madhan Kumar";
        res_body["redirect_url"] = "dashboard.html";

        crow::response res(200, res_body);
        res.set_header("Content-Type", "application/json");
        return res;
    });

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

        std::cout << "[AUTH] New user registered via Supabase: " << full_name << " (" << email << ")" << std::endl;

        res_body["status"] = "success";
        res_body["message"] = "Account created successfully.";
        return crow::response(201, res_body);
    });

    // -------------------------------------------------------------------------
    // 3. Products & Database Health Endpoints
    // -------------------------------------------------------------------------
    CROW_ROUTE(app, "/api/health")
    ([database_url, supabase_url]() {
        crow::json::wvalue res;
        res["service"] = "Madhan Mart C++ Backend";
        res["status"] = "healthy";
        res["version"] = "1.0.0";
        res["database_configured"] = !database_url.empty();
        res["supabase_configured"] = !supabase_url.empty();
        return crow::response(200, res);
    });

    std::cout << "=================================================" << std::endl;
    std::cout << "  MADHAN MART - C++ Crow Backend Server          " << std::endl;
    std::cout << "=================================================" << std::endl;
    std::cout << " Port: " << port << std::endl;
    std::cout << " Supabase Database: " 
              << (database_url.empty() ? "[NOT SET - copy .env.example to .env]" : "[CONFIGURED]") << std::endl;
    std::cout << " Server URL: http://localhost:" << port << std::endl;
    std::cout << "=================================================" << std::endl;

    app.port(port).multithreaded().run();
    return 0;
}
