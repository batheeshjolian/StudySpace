import json
import boto3
import uuid
from datetime import datetime

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("StudySpaceBookings")


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


def lambda_handler(event, context):
    try:
        http_method = event.get("httpMethod")
        path = event.get("path", "")

        if http_method == "OPTIONS":
            return response(200, {"message": "CORS preflight OK"})

        if http_method == "GET" and path.endswith("/bookings"):
            return get_bookings()

        if http_method == "POST" and path.endswith("/bookings"):
            return create_booking(event)

        if http_method == "DELETE" and "/bookings/" in path:
            booking_id = path.split("/bookings/")[-1]
            return delete_booking(booking_id)

        return response(404, {"message": "Route not found"})

    except Exception as e:
        print("Error:", str(e))
        return response(500, {"message": "Internal server error", "error": str(e)})
        # Booking validation feature


def create_booking(event):
    body = json.loads(event.get("body", "{}"))

    booking_id = str(uuid.uuid4())

    item = {
        "bookingId": booking_id,
        "studentName": body.get("studentName", ""),
        "email": body.get("email", ""),
        "room": body.get("room", ""),
        "date": body.get("date", ""),
        "time": body.get("time", ""),
        "createdAt": datetime.utcnow().isoformat()
    }

    table.put_item(Item=item)

    return response(201, {
        "message": "Booking created successfully",
        "booking": item
    })


def get_bookings():
    result = table.scan()
    bookings = result.get("Items", [])

    bookings.sort(key=lambda x: x.get("createdAt", ""), reverse=True)

    return response(200, bookings)


def delete_booking(booking_id):
    table.delete_item(
        Key={
            "bookingId": booking_id
        }
    )

    return response(200, {
        "message": "Booking deleted successfully",
        "bookingId": booking_id
    })
