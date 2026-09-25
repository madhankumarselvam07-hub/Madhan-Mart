# MADHAN MART - Backend Setup

This directory contains the C++17 Crow web server and PostgreSQL database setup for **MADHAN MART**.

## Structure
- `main.cpp` - C++ Crow server handling static file delivery from `../frontend` and `/api/auth/login` authentication endpoints.
- `CMakeLists.txt` - CMake configuration to build the server.
- `schema.sql` - PostgreSQL schema for `users` and `user_sessions`.

## Prerequisites
- C++17 compliant compiler (GCC 9+, Clang 10+, or MSVC 2019+)
- CMake 3.15+
- [Crow C++ Library](https://crowcpp.org/) (Header-only `crow_all.h` or package install)
- PostgreSQL 12+ (optional for live database)

## Build Instructions

```bash
mkdir build
cd build
cmake ..
cmake --build .
./madhan_mart_server
```

Once running, access the login page at:
`http://localhost:8080`
