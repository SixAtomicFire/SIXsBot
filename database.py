import firebase_admin
from firebase_admin import credentials, firestore
import config

cred = credentials.Certificate(config.FIREBASE_KEY_PATH)
firebase_admin.initialize_app(cred)
db = firestore.client()

def get_next_ticket_id() -> int:
    counter_ref = db.collection("settings").document("counters")
    doc = counter_ref.get()
    
    if not doc.exists:
        counter_ref.set({"ticket_count": 1})
        return 1
    
    new_id = doc.to_dict().get("ticket_count", 0) + 1
    counter_ref.update({"ticket_count": new_id})
    return new_id

def save_ticket_data(ticket_id: str, data: dict):
    db.collection("tickets").document(ticket_id).set(data, merge=True)

def get_ticket_data(ticket_id: str) -> dict:
    doc = db.collection("tickets").document(ticket_id).get()
    return doc.to_dict() if doc.exists else {}

def save_review_data(ticket_id: str, data: dict):
    db.collection("reviews").document(ticket_id).set(data)