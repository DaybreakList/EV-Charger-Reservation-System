import os
from dotenv import load_dotenv

load_dotenv()

def getMapAPI():
    GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

    if GOOGLE_MAPS_API_KEY is None:
        raise Exception("Couldn't get Google Map API key. Maybe '.env' problem?")
    else:
        return GOOGLE_MAPS_API_KEY