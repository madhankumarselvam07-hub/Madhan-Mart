cmake_minimum_required(VERSION 3.15)
project(MadhanMartBackend CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find Threads
find_package(Threads REQUIRED)

# Crow is header-only or installed via vcpkg / package manager
# Include directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR})

# Optional: Find PostgreSQL / libpqxx if installed
find_package(PostgreSQL QUIET)
if (PostgreSQL_FOUND)
    include_directories(${PostgreSQL_INCLUDE_DIRS})
endif()

# Executable definition
add_executable(madhan_mart_server main.cpp)

# Link Libraries
target_link_libraries(madhan_mart_server PRIVATE
    Threads::Threads
)

if (PostgreSQL_FOUND)
    target_link_libraries(madhan_mart_server PRIVATE ${PostgreSQL_LIBRARIES})
endif()
