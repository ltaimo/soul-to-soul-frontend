# Soul to Soul ERP — Version 1.0.0 Launch Guide

## Deployment URLs
* **Frontend App**: `https://[your-frontend-domain]`
* **Backend API**: `https://soul-to-soul-backend.onrender.com`

## Initial Administrator Access
On a fresh database, the system will automatically create:

* **Email:** [admin@soultosoul.local](mailto:admin@soultosoul.local)
* **Password:** `Admin@123`

> **Mandatory Action:** Immediately log in and change this password to a secure private password.

## User Roles
* **Admin:** full system control (users, settings, operations)
* **Manager:** operational control (no settings/users)
* **Staff:** daily operations
* **Viewer:** read-only access

## Database & Environment Security
* Rotate your Supabase database password
* Store `DATABASE_URL` only in Render environment variables
* Never store database credentials in source code, GitHub, or shared files

## Backup Responsibility
* Perform weekly exports of:
  * Products
  * Users
  * Inventory data
* Store backups securely outside the system

## System Status
* All API endpoints are protected via JWT authentication
* Role-based access control is enforced at backend level
* Currency, formatting, and settings are dynamically driven by database configuration

Welcome to Version 1.0
