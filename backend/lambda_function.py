import json
import boto3
import uuid
import hashlib
import re
from datetime import datetime
from boto3.dynamodb.conditions import Attr

# ---------- DynamoDB tables ----------
dynamodb = boto3.resource("dynamodb")
bookings_table = dynamodb.Table("StudySpaceBookings")
users_table = dynamodb.Table("StudySpaceUsers")  # NEW table for accounts

# ---------- Business rules ----------
OPEN_TIME = "08:00"
CLOSE_TIME = "20:00"
MAX_BOOKING_HOURS = 3
SINGLE_ROOMS = ["Room A", "Room B"]          # 1 person
GROUP_ROOMS = ["Room C", "Computer Lab"]     # group rooms
MIN_GROUP_FRIENDS = 3                         # booker + 3 friends = 4 people
ADMIN_PIN = "1234"                            # staff override for cancellations


# ---------- Helpers ----------
def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        "body": json.dumps(body)
    }


def hash_password(password):
    # Simple SHA-256 hashing so we never store plain-text passwords.
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def validate_password(pw):
    if len(pw) < 8:
        return "Password must be at least 8 characters."
    if not re.search(r"[A-Z]", pw):
        return "Password must include at least one uppercase letter."
    if not re.search(r"[0-9]", pw):
        return "Password must include at least one number."
    if not re.search(r"[^A-Za-z0-9]", pw):
        return "Password must include at least one special character."
    return None


def time_to_minutes(t):
    h, m = t.split(":")
    return int(h) * 60 + int(m)


# ---------- Router ----------
def lambda_handler(event, context):
    try:
        http_method = event.get("httpMethod")
        path = event.get("path", "")

        if http_method == "OPTIONS":
            return response(200, {"message": "CORS preflight OK"})

        if http_method == "POST" and path.endswith("/signup"):
            return signup(event)
        if http_method == "POST" and path.endswith("/login"):
            return login(event)
        if http_method == "GET" and path.endswith("/bookings"):
            return get_bookings()
        if http_method == "POST" and path.endswith("/bookings"):
            return create_booking(event)
        if http_method == "DELETE" and "/bookings/" in path:
            booking_id = path.split("/bookings/")[-1]
            return delete_booking(booking_id, event)

        return response(404, {"message": "Route not found"})
    except Exception as e:
        print("Error:", str(e))
        return response(500, {"message": "Internal server error", "error": str(e)})


# ---------- Authentication ----------
def signup(event):
    body = json.loads(event.get("body", "{}"))
    student_id = body.get("studentId", "").strip()
    name = body.get("studentName", "").strip()
    password = body.get("password", "")

    if not student_id or not name or not password:
        return response(400, {"message": "Name, student ID and password are required."})

    pw_error = validate_password(password)
    if pw_error:
        return response(400, {"message": pw_error})

    existing = users_table.get_item(Key={"studentId": student_id})
    if "Item" in existing:
        return response(409, {"message": "A user with this student ID already exists."})

    users_table.put_item(Item={
        "studentId": student_id,
        "studentName": name,
        "passwordHash": hash_password(password),
        "createdAt": datetime.utcnow().isoformat()
    })

    return response(201, {
        "message": "Account created successfully.",
        "studentId": student_id,
        "studentName": name
    })


def login(event):
    body = json.loads(event.get("body", "{}"))
    student_id = body.get("studentId", "").strip()
    password = body.get("password", "")

    if not student_id or not password:
        return response(400, {"message": "Student ID and password are required."})

    result = users_table.get_item(Key={"studentId": student_id})
    user = result.get("Item")

    if not user or user.get("passwordHash") != hash_password(password):
        return response(401, {"message": "Invalid student ID or password."})

    return response(200, {
        "message": "Login successful.",
        "studentId": user["studentId"],
        "studentName": user.get("studentName", "")
    })


# ---------- Bookings ----------
def create_booking(event):
    body = json.loads(event.get("body", "{}"))

    student_name = body.get("studentName", "").strip()
    student_id = body.get("studentId", "").strip()
    contact = body.get("contact", "").strip()
    room = body.get("room", "").strip()
    date = body.get("date", "").strip()
    start_time = body.get("startTime", "").strip()
    end_time = body.get("endTime", "").strip()
    friends_raw = body.get("friendsIds", "").strip()

    # --- required fields ---
    if not (student_id and student_name and room and date and start_time and end_time):
        return response(400, {"message": "Please fill all required fields."})

    # --- booker must be a registered user ---
    booker = users_table.get_item(Key={"studentId": student_id}).get("Item")
    if not booker:
        return response(401, {"message": "You must be a registered user to book."})

    # --- working hours ---
    if start_time < OPEN_TIME or end_time > CLOSE_TIME:
        return response(400, {"message": f"Booking must be within working hours {OPEN_TIME}-{CLOSE_TIME}."})

    # --- end after start ---
    start_min = time_to_minutes(start_time)
    end_min = time_to_minutes(end_time)
    if end_min <= start_min:
        return response(400, {"message": "End time must be after start time."})

    # --- max 3 hours ---
    if (end_min - start_min) > MAX_BOOKING_HOURS * 60:
        return response(400, {"message": f"Booking cannot be longer than {MAX_BOOKING_HOURS} hours."})

    # --- no past date/time ---
    try:
        slot_start = datetime.strptime(f"{date} {start_time}", "%Y-%m-%d %H:%M")
        if slot_start < datetime.now():
            return response(400, {"message": "You cannot book a past date or time."})
    except ValueError:
        return response(400, {"message": "Invalid date or time format."})

    # --- group room rules ---
    friends = [f.strip() for f in friends_raw.split(",") if f.strip()]
    if room in GROUP_ROOMS:
        if len(friends) < MIN_GROUP_FRIENDS:
            return response(400, {
                "message": f"{room} is a group room and requires at least {MIN_GROUP_FRIENDS} friends' student IDs."
            })
        for fid in friends:
            if fid == student_id:
                return response(400, {"message": "Do not include your own ID in the friends list."})
            f_user = users_table.get_item(Key={"studentId": fid}).get("Item")
            if not f_user:
                return response(400, {"message": f"Friend ID {fid} is not a registered user."})
    else:
        friends = []  # single rooms ignore friends

    # --- overlap check (no double-booking the same room/date/time) ---
    existing = bookings_table.scan(
        FilterExpression=Attr("room").eq(room) & Attr("date").eq(date)
    ).get("Items", [])

    for b in existing:
        b_start = time_to_minutes(b.get("startTime", "00:00"))
        b_end = time_to_minutes(b.get("endTime", "00:00"))
        if start_min < b_end and end_min > b_start:
            return response(409, {
                "message": f"{room} is already booked from {b.get('startTime')} to {b.get('endTime')} on {date}."
            })

    # --- create booking + auto-generated cancellation code ---
    booking_id = str(uuid.uuid4())
    cancellation_code = uuid.uuid4().hex[:6].upper()

    item = {
        "bookingId": booking_id,
        "studentName": student_name,
        "studentId": student_id,
        "contact": contact,
        "room": room,
        "date": date,
        "startTime": start_time,
        "endTime": end_time,
        "friendsIds": ", ".join(friends) if friends else "None",
        "cancellationCode": cancellation_code,
        "status": "Reserved",
        "createdAt": datetime.utcnow().isoformat()
    }

    bookings_table.put_item(Item=item)

    # Return the code ONCE so the user can copy it. It is never exposed again.
    public = {k: v for k, v in item.items() if k != "cancellationCode"}
    return response(201, {
        "message": "Booking created successfully",
        "cancellationCode": cancellation_code,
        "booking": public
    })


def get_bookings():
    result = bookings_table.scan()
    bookings = result.get("Items", [])
    # Never expose cancellation codes in the public list.
    for b in bookings:
        b.pop("cancellationCode", None)
    bookings.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return response(200, bookings)


def delete_booking(booking_id, event):
    body = json.loads(event.get("body", "{}"))
    code = body.get("code", "").strip()

    if not code:
        return response(400, {"message": "Cancellation code is required."})

    result = bookings_table.get_item(Key={"bookingId": booking_id})
    booking = result.get("Item")

    if not booking:
        return response(404, {"message": "Booking not found."})

    # Admin PIN can cancel anything; otherwise the code must match.
    if code != ADMIN_PIN and booking.get("cancellationCode") != code:
        return response(403, {"message": "Incorrect cancellation code."})

    bookings_table.delete_item(Key={"bookingId": booking_id})
    return response(200, {"message": "Booking cancelled successfully", "bookingId": booking_id})
