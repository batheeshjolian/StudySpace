# StudySpace
https://studyspace.proj.rotem.click

## Serverless Study Room Booking System

StudySpace is a serverless cloud application that allows students to book study rooms in a college environment.

The system allows users to create, view, and cancel study room bookings.  
It is designed as a simple and practical cloud-based application using AWS serverless services.

---

## Project Track

Serverless Application

---

## Team Members

- Jolian Batheesh - ID: 324005917
- George Kass - ID: 211733175
- Amr Habiballa - ID: 324990910

---

## What the System Does

StudySpace allows a student to:

- Enter full name and email
- Select a study room
- Select a date
- Select a time
- Create a booking
- View current bookings
- Cancel an existing booking

---

## Main Use Case

A student wants to reserve a study room in the college.

The student opens the website, fills in the booking form, selects a room, date and time, and submits the request.  
The booking is sent to the backend API and saved in DynamoDB.

---

## AWS Architecture

The system is built using AWS serverless services:

- Amazon S3 - hosts the static frontend website
- Amazon CloudFront - distributes the website and provides HTTPS access
- Amazon Route 53 - manages the domain or subdomain
- AWS Certificate Manager - provides SSL/TLS certificate for HTTPS
- Amazon API Gateway - exposes REST API endpoints
- AWS Lambda - handles backend logic
- Amazon DynamoDB - stores booking records
- Amazon CloudWatch - provides logs and monitoring
- AWS IAM - manages permissions and roles

---

## Architecture Flow

User  
→ CloudFront with HTTPS  
→ S3 Static Website  
→ API Gateway  
→ Lambda  
→ DynamoDB  

Monitoring: CloudWatch Logs and Metrics  
CI/CD: GitHub Actions

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /bookings | Get all bookings |
| POST | /bookings | Create a new booking |
| DELETE | /bookings/{bookingId} | Cancel a booking |

---

## Repository Structure

```text
StudySpace/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── backend/
│   └── lambda_function.py
│
├── .github/
│   └── workflows/
│       └── deploy.yml
│
└── README.md
