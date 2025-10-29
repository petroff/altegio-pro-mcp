# OpenAPI Specification Issues - Staff Creation Endpoint

## Summary
The OpenAPI specification for the staff creation endpoint (`POST /company/{company_id}/staff/quick`) is missing **3 required fields** that the actual Altegio API enforces. This causes integration failures when following the documented specification.

## Affected Endpoint
- **Path**: `POST /company/{company_id}/staff/quick`
- **OpenAPI spec location**: `docs/altegio/en/paths/staff/api.location.staff.create_quick.yml`

## Issues Found

### 1. Missing Required Fields

The specification documents only 4 required parameters:
- `name` (string)
- `specialization` (string)
- `position_id` (number, nullable)
- `phone_number` (string, nullable)

However, the **actual API requires 3 additional fields**:

| Field | Type | Required | Description | Currently in Spec |
|-------|------|----------|-------------|-------------------|
| `user_email` | string | ✅ Yes | User email address | ❌ Missing |
| `user_phone` | string | ✅ Yes | User phone number | ❌ Missing |
| `is_user_invite` | boolean | ✅ Yes | User invitation flag | ❌ Missing |

### 2. API Validation Error

When attempting to create staff with only the documented parameters, the API returns:

```
Error: К сожалению, текущая версия API не позволяет создать сотрудника
с предоставленными параметрами
```

Translation: "Unfortunately, the current API version does not allow creating
an employee with the provided parameters"

The API validation specifically requires: `user_email`, `user_phone`, `is_user_invite`

## Testing Evidence

### Request that FAILS (following current spec):
```json
POST /company/456/staff/quick
{
  "name": "John Doe",
  "specialization": "Stylist",
  "position_id": 1,
  "phone_number": "1234567890"
}
```
**Result**: ❌ API validation error

### Request that SUCCEEDS (with missing fields):
```json
POST /company/456/staff/quick
{
  "name": "John Doe",
  "specialization": "Stylist",
  "position_id": 1,
  "phone_number": "1234567890",
  "user_email": "john@example.com",
  "user_phone": "1234567890",
  "is_user_invite": true
}
```
**Result**: ✅ Success

## Recommended Fixes

### 1. Update `api.location.staff.create_quick.yml`

Add the following parameters to the request body schema:

```yaml
user_email:
  type: string
  format: email
  description: User email address
  required: true
  example: "employee@example.com"

user_phone:
  type: string
  description: User phone number (without +, 9-15 digits)
  required: true
  pattern: '^[0-9]{9,15}$'
  example: "1234567890"

is_user_invite:
  type: boolean
  description: Whether to send invitation to user
  required: true
  example: true
```

### 2. Update `required` Array

Ensure the `required` array includes all mandatory fields:

```yaml
required:
  - name
  - specialization
  - position_id
  - phone_number
  - user_email
  - user_phone
  - is_user_invite
```

## Impact

**High Priority** - This discrepancy blocks developers from:
- Creating staff members via API following official documentation
- Building reliable MCP/LLM integrations
- Automated testing with specification-generated clients

## Environment

- API Base URL: `https://api.alteg.io/api/v1`
- Tested with: Altegio Partner API (B2B endpoints)
- Authentication: Partner token + User token (obtained via `/auth`)
- Date discovered: January 29, 2025

## Additional Context

The specification appears to be outdated or incomplete. The actual API behavior suggests these fields were added in a recent API version but not documented in the OpenAPI specification.

**Request**: Please update the OpenAPI specification to match the actual API requirements to prevent integration failures for developers following the official documentation.

---

**Reporter**: MCP Server Development Team
**Integration**: @altegio/mcp-server-pro (https://github.com/petroff/altegio-pro-mcp)
