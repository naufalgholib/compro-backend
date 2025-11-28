@echo off
REM ================================
REM CR System Docker Helper Scripts (Windows)
REM ================================

setlocal enabledelayedexpansion

REM Check if docker is running
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker first.
    exit /b 1
)

if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="--help" goto help
if "%1"=="-h" goto help

if "%1"=="dev" goto dev
if "%1"=="dev:build" goto dev_build
if "%1"=="dev:down" goto dev_down
if "%1"=="prod" goto prod
if "%1"=="prod:build" goto prod_build
if "%1"=="prod:down" goto prod_down
if "%1"=="logs" goto logs
if "%1"=="migrate" goto migrate
if "%1"=="seed" goto seed
if "%1"=="shell" goto shell
if "%1"=="clean" goto clean

goto help

:dev
echo [INFO] Starting development environment...
echo [NOTE] Make sure your external PostgreSQL is running!
docker compose -f docker-compose.dev.yml up -d
echo [SUCCESS] Development environment started!
echo [INFO] API: http://localhost:3000
echo [INFO] API Docs: http://localhost:3000/api-docs
goto end

:dev_build
echo [INFO] Building and starting development environment...
docker compose -f docker-compose.dev.yml up -d --build
echo [SUCCESS] Development environment started!
goto end

:dev_down
echo [INFO] Stopping development environment...
docker compose -f docker-compose.dev.yml down
echo [SUCCESS] Development environment stopped!
goto end

:prod
echo [INFO] Starting production environment...
echo [NOTE] Make sure your external PostgreSQL is running!
docker compose -f docker-compose.yml up -d
echo [SUCCESS] Production environment started!
echo [INFO] API: http://localhost:3000
echo [INFO] API Docs: http://localhost:3000/api-docs
goto end

:prod_build
echo [INFO] Building and starting production environment...
docker compose -f docker-compose.yml up -d --build
echo [SUCCESS] Production environment started!
goto end

:prod_down
echo [INFO] Stopping production environment...
docker compose -f docker-compose.yml down
echo [SUCCESS] Production environment stopped!
goto end

:logs
docker compose -f docker-compose.dev.yml logs -f api
goto end

:migrate
echo [INFO] Running database migrations...
docker compose -f docker-compose.dev.yml exec api npx prisma migrate deploy
echo [SUCCESS] Migrations completed!
goto end

:seed
echo [INFO] Seeding database...
docker compose -f docker-compose.dev.yml exec api npm run seed
echo [SUCCESS] Database seeded!
goto end

:shell
docker compose -f docker-compose.dev.yml exec api sh
goto end

:clean
echo [WARNING] This will remove all containers, volumes, and images!
set /p confirm="Are you sure? (y/N): "
if /i "!confirm!"=="y" (
    echo [INFO] Cleaning up...
    docker compose -f docker-compose.yml down -v --rmi all 2>nul
    docker compose -f docker-compose.dev.yml down -v --rmi all 2>nul
    echo [SUCCESS] Cleanup completed!
) else (
    echo [INFO] Cleanup cancelled.
)
goto end

:help
echo.
echo CR System Docker Helper
echo ========================
echo.
echo Usage: docker.bat [command]
echo.
echo Commands:
echo   dev           Start development environment
echo   dev:build     Build and start development environment
echo   dev:down      Stop development environment
echo   prod          Start production environment
echo   prod:build    Build and start production environment
echo   prod:down     Stop production environment
echo   logs          View API container logs
echo   migrate       Run database migrations
echo   seed          Seed the database
echo   shell         Open shell in api container
echo   clean         Remove all containers, volumes, and images
echo   help          Show this help message
echo.
echo Note: Database is external. Configure DATABASE_URL in .env.docker
echo.
goto end

:end
endlocal
