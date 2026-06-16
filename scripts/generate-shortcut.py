#!/usr/bin/env python3
"""Generates a valid iOS Shortcuts .shortcut (binary plist) file for Levi Health."""
import plistlib
import uuid

def uid():
    return str(uuid.uuid4()).upper()

# UUIDs for each action so outputs can be referenced
hrv_uuid      = uid()
steps_uuid    = uid()
calories_uuid = uid()
hr_uuid       = uid()
dict_uuid     = uid()
url_uuid      = uid()
req_uuid      = uid()
result_uuid   = uid()

def token(action_uuid, output_name):
    """Reference an action's output as a variable token."""
    return {
        "Value": {
            "Type": "ActionOutput",
            "OutputName": output_name,
            "OutputUUID": action_uuid,
        },
        "WFSerializationType": "WFTextTokenAttachment",
    }

def text_token(text):
    return {
        "Value": {"string": text},
        "WFSerializationType": "WFTextTokenString",
    }

def health_action(action_uuid, quantity_type, result_type, output_name):
    return {
        "WFWorkflowActionIdentifier": "is.workflow.actions.health.quantity.query",
        "WFWorkflowActionParameters": {
            "WFHealthQuantityType": quantity_type,
            "WFHealthQuantityResultType": result_type,
            "CustomOutputName": output_name,
        },
        "WFWorkflowActionMetadata": {"WFWorkflowActionItemId": action_uuid},
    }

def dict_item(key_str, value_token):
    return {
        "WFItemType": 0,
        "WFKey": text_token(key_str),
        "WFValue": value_token,
    }

actions = [
    # 1. HRV (latest reading)
    health_action(hrv_uuid, "Heart Rate Variability (SDNN)", "Latest", "HRV"),

    # 2. Steps (sum for today)
    health_action(steps_uuid, "Step Count", "Sum", "Steps"),

    # 3. Active Calories (sum for today)
    health_action(calories_uuid, "Active Energy Burned", "Sum", "Calories"),

    # 4. Heart Rate (latest)
    health_action(hr_uuid, "Heart Rate", "Latest", "HeartRate"),

    # 5. Build JSON dictionary
    {
        "WFWorkflowActionIdentifier": "is.workflow.actions.dictionary",
        "WFWorkflowActionParameters": {
            "WFItems": {
                "Value": {
                    "WFDictionaryFieldValueItems": [
                        dict_item("hrv",        token(hrv_uuid,      "HRV")),
                        dict_item("steps",      token(steps_uuid,    "Steps")),
                        dict_item("calories",   token(calories_uuid, "Calories")),
                        dict_item("heart_rate", token(hr_uuid,       "HeartRate")),
                    ]
                },
                "WFSerializationType": "WFDictionaryFieldValue",
            },
            "CustomOutputName": "HealthData",
        },
        "WFWorkflowActionMetadata": {"WFWorkflowActionItemId": dict_uuid},
    },

    # 6. POST to Levi API
    {
        "WFWorkflowActionIdentifier": "is.workflow.actions.downloadurl",
        "WFWorkflowActionParameters": {
            "WFHTTPMethod": "POST",
            "WFURL": "https://levi-health.netlify.app/api/health-import",
            "WFHTTPBodyType": "JSON",
            "WFInput": token(dict_uuid, "HealthData"),
            "CustomOutputName": "Response",
        },
        "WFWorkflowActionMetadata": {"WFWorkflowActionItemId": req_uuid},
    },

    # 7. Show success notification
    {
        "WFWorkflowActionIdentifier": "is.workflow.actions.notification",
        "WFWorkflowActionParameters": {
            "WFNotificationActionTitle": "Levi Update",
            "WFNotificationActionBody": "Gesundheitsdaten erfolgreich übertragen!",
        },
        "WFWorkflowActionMetadata": {"WFWorkflowActionItemId": result_uuid},
    },
]

shortcut = {
    "WFWorkflowMinimumClientVersion": 900,
    "WFWorkflowMinimumClientVersionString": "900",
    "WFWorkflowName": "Levi Update",
    "WFWorkflowActions": actions,
    "WFWorkflowIcon": {
        "WFWorkflowIconStartColor": 431817727,   # green
        "WFWorkflowIconGlyphNumber": 59511,
    },
    "WFWorkflowImportQuestions": [],
    "WFWorkflowInputContentItemClasses": [],
    "WFWorkflowOutputContentItemClasses": [],
    "WFWorkflowTypes": ["NCWidget", "WatchKit"],
    "WFWorkflowHasOutputFallback": False,
    "WFWorkflowNoInputBehavior": {
        "Name": "RunImmediately",
        "Parameters": {},
    },
}

out = "/Users/juliandomogalla/Claude/levi-health/public/levi-shortcut.shortcut"
with open(out, "wb") as f:
    plistlib.dump(shortcut, f, fmt=plistlib.FMT_BINARY)

print(f"Created: {out}")
