Running the Marketplace.store project (backend + Postgres) with Docker

Prerequisites
- Install Docker Desktop and ensure it's running.
- (Optional) Install `docker-compose` if your Docker requires it.

1) Prepare environment
- Copy `backend/.env.example` to `backend/.env` and set values. When running with Docker Compose, set `DATABASE_URL` to:

  postgres://postgres:password@db:5432/dealerconnect

  Also set `JWT_SECRET` and Cloudinary keys (or placeholders if not used).

2) Start the stack (builds backend image, runs Postgres and init service):
```powershell
cd "c:\Users\ELCOT\Documents\New folder\marketplace"
docker compose up -d --build
```

3) Check services and logs
```powershell
docker compose ps
docker compose logs -f init-db
docker compose logs -f backend
docker compose logs -f db
```

4) Verify DB tables were created
```powershell
docker compose exec db psql -U postgres -d dealerconnect -c "\dt"
```

5) Test the backend
```powershell
curl http://localhost:5000/
# should return JSON {"message": "DealerConnect backend is running"}
```

6) To stop and remove containers
```powershell
docker compose down
```

Troubleshooting
- If you see "connection refused" for the backend:
  - Ensure Docker Desktop is running.
  - Confirm `backend/.env` uses host `db` for `DATABASE_URL` when using Docker Compose.
  - Check `docker compose logs db` and `docker compose logs backend` for errors.
- If `init-db` didn't create tables, run manually:
  ```powershell
  docker compose exec -T db psql -U postgres -d dealerconnect < backend/sql/schema.sql
  ```

Running locally without Docker
- Install Node.js >=18 and PostgreSQL, create DB `dealerconnect` and run `psql -f backend/sql/schema.sql` then run `npm install` in `backend` and `npm run dev`.

Flutter app
- From `flutter_app` run `flutter pub get` then `flutter run` (device/emulator needed). Update API base URL in `flutter_app/lib/services/api_service.dart` to `http://localhost:5000/api`.

If you run the Docker commands and paste the outputs of `docker compose ps` and `docker compose logs backend --tail 200`, I will diagnose any remaining errors and produce fixes.
