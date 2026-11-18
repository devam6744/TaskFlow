# TaskFlow — Learning Guide: Authentication & User Architecture (Phase 1 & 2)

> **Uddeshya (Purpose):** Yeh document TaskFlow ke Authentication & Custom User Model ke har single concept ko aasan bhasha (Hindi + English) mein samjhata hai. Isko padhne ke baad tum kisi bhi interview mein confidently explain kar paoge ki humne kya choose kiya, kyun kiya, aur deep level par yeh kaise kaam karta hai.

---

## 📑 Table of Contents
1. [Custom User Model — Kyun aur Kaise?](#1-custom-user-model--kyun-aur-kaise)
2. [UUID vs Integer (Auto-Increment) ID](#2-uuid-vs-integer-auto-increment-id)
3. [Password Hashing (PBKDF2, Salt, Rounds)](#3-password-hashing-pbkdf2-salt-rounds)
4. [JWT Architecture (JSON Web Token) Deep Dive](#4-jwt-architecture-json-web-token-deep-dive)
5. [Access Token vs Refresh Token — Kyun Dono Chahiye?](#5-access-token-vs-refresh-token--kyun-dono-chahiye)
6. [Token Storage: HttpOnly Cookies vs LocalStorage (XSS vs CSRF)](#6-token-storage-httponly-cookies-vs-localstorage-xss-vs-csrf)
7. [Token Rotation aur Blacklisting](#7-token-rotation-aur-blacklisting)
8. [Anti-Enumeration Attack Prevention](#8-anti-enumeration-attack-prevention)
9. [Rate Limiting (Brute-Force Defense)](#9-rate-limiting-brute-force-defense)
10. [Service Layer Pattern (Separation of Concerns)](#10-service-layer-pattern-separation-of-concerns)
11. [Interview Questions & Instant Cheatsheet](#11-interview-questions--instant-cheatsheet)

---

## 1. Custom User Model — Kyun aur Kaise?

### Problem kya hai?
Django by default ek `User` model deta hai (`django.contrib.auth.models.User`). Usme:
- Login ke liye `username` mandatory hota hai (not email).
- Primary key integer hoti hai (`id = 1, 2, 3...`).
- First name, last name alag fields hote hain.

Agar tumne standard `User` model use karke database migrations run kar diye, aur 6 mahine baad client bolta hai: *"Mujhe username nahi chahiye, sirf email login chahiye"*, toh Django mein chalte project ka User model change karna **ek nightmare** ban jata hai. Foreign keys break ho jaate hain aur data migrate karna padta hai.

### Humne kya kiya?
Humne project ke pehle din hi `AbstractBaseUser` aur `PermissionsMixin` inherit karke custom model banaya:
```python
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin

class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=150)
    ...
    USERNAME_FIELD = 'email'  # Email se login hoga
    REQUIRED_FIELDS = ['display_name']
```

### AbstractBaseUser vs AbstractUser:
- **`AbstractUser`**: Django ke default user ke saare fields (username, first_name, last_name wagairah) le leta hai, bas tum extra fields add karte ho.
- **`AbstractBaseUser`**: Bilkul clean slate deta hai. Sirf `password`, `last_login`, aur password hashing logic milti hai. Baaki sab hum decide karte hain. Enterprise projects mein hamesha `AbstractBaseUser` prefer kiya jata hai full control ke liye.

---

## 2. UUID vs Integer (Auto-Increment) ID

### Difference:
- **Integer ID**: 1, 2, 3, 4, 5... (Sequential)
- **UUIDv4**: `c3a8b417-68b2-4d2b-9271-925f46e50711` (128-bit randomly generated)

### Humne UUID kyun use kiya? (Interview Hot Topic 🔥)
1. **ID Enumeration Prevention / Security by Obscurity Nahi, Data Leakage Prevention:**
   - Agar tumhara user URL hai: `api/v1/users/42/profile`, toh koi bhi script chala kar `43`, `44`, `45` access karke dekh sakta hai.
   - Competitor ko pata chal jayega ki tumhare kitne users hain (e.g. agar last user ID 1024 hai toh tumhare ~1000 users hain).
   - UUID se koi guess nahi kar sakta ki agla user ID kya hoga ($2^{122}$ collision probability).
2. **Distributed Systems Ready:**
   - Database shard ho ya offline client data create kare, ID generate karne ke liye central database se sequence mangne ki zaroorat nahi padti. Client ya backend worker independently UUID generate kar sakta hai bina collision ke.

---

## 3. Password Hashing (PBKDF2, Salt, Rounds)

### Kabhi bhi password plaintext mein save nahi hota!
Database mein password kuch aisa dikhta hai:
```
pbkdf2_sha256$870000$h7YwZ9k8X...$4sP9xLz...
```

### Breakdown:
1. **Algorithm:** `pbkdf2_sha256` (Password-Based Key Derivation Function 2)
2. **Work Factor / Iterations:** `870000` (8 lakh 70 hazaar rounds!)
3. **Salt:** Random cryptographically secure bytes (`h7YwZ9k8X...`). Har user ka salt alag hota hai.
   - Salt kyun zaroori hai? Rainbow Tables attack ko fail karne ke liye. Agar do users ka password same ho ("secret123"), tab bhi dono ka hash bilkul different banega kyunki salt alag hai!
4. **Digest:** Final computed hash.

### Verification process:
Jab user login karta hai, Django input password + stored salt leta hai, 870,000 rounds hash karta hai, aur result ko stored hash se compare karta hai using **Constant-Time Comparison** (`hmac.compare_digest`). Is se **Timing Attacks** rukte hain.

---

## 4. JWT Architecture (JSON Web Token) Deep Dive

JWT ek stateless identity token hota hai jo 3 parts se bana hota hai, separated by dots (`.`):
```
eyJhbGciOi... . eyJ1c2VyX2lkIj... . SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
 [ Header ]   .   [ Payload ]    .             [ Signature ]
```

1. **Header (Alg & Typ):** Batata hai token kis type ka hai aur signature ke liye kaun sa algorithm use hua (e.g. HS256).
2. **Payload (Claims):** User ki information (e.g., `user_id`, `exp`, `iat`). 
   > ⚠️ **Caution:** Payload sirf Base64 encoded hota hai, encrypted nahi! Koi bhi payload padh sakta hai. Isliye kabhi sensitive data jaise password ya credit card JWT payload mein nahi daalte.
3. **Signature:** `HMACSHA256(base64(header) + "." + base64(payload), SECRET_KEY)`.
   - Yeh signature guarantee karta hai ki token tamper (modify) nahi kiya gaya. Agar attacker payload mein `user_id: 1` ko `user_id: 99` kar de, toh signature match nahi hoga aur request 401 Unauthorized ho jayegi.

---

## 5. Access Token vs Refresh Token — Kyun Dono Chahiye?

| Feature | Access Token | Refresh Token |
|---|---|---|
| **Lifetime** | Short (15 Minutes) | Long (7 Days) |
| **Where Sent** | Har API request ke `Authorization: Bearer <token>` header mein | Sirf `/auth/token/refresh/` endpoint pe |
| **Storage** | Frontend Memory (Zustand store) | HttpOnly Secure Cookie |
| **Purpose** | API endpoints ko prove karna ki user logged in hai | Naya access token mangna jab purana expire ho jaye |

### Kyun dono chahiye?
- Agar sirf **ek long-lived token (7 days)** hota aur attacker ne chura liya, toh attacker 7 din tak user ka account chala sakta hai bina user ko pata chale.
- Agar sirf **ek short-lived token (15 mins)** hota, toh user ko har 15 minute baad login form bharna padta (terrible user experience!).
- **Dual Token Architecture:** Access token chori ho bhi jaye, toh attacker ke paas sirf 15 minute ka window hota hai. Refresh token hum safe HttpOnly cookie mein rakhte hain jo JavaScript access hi nahi kar sakti!

---

## 6. Token Storage: HttpOnly Cookies vs LocalStorage (XSS vs CSRF)

Yeh interviewers ka sabse favourite question hota hai: *"Where do you store tokens on frontend and why?"*

### LocalStorage ki problem (XSS Vulnerability):
Agar tum refresh token ya access token `localStorage.setItem('token', ...)` mein rakhte ho:
- Agar tumhari site par koi bhi XSS (Cross-Site Scripting) bug aaya (kisi npm package mein malicious code, ya unescaped user input), attacker `localStorage.getItem('token')` execute karke token chura sakta hai aur apne server par bhej sakta hai!

### HttpOnly Cookies ka fayda:
- `HttpOnly` flag browser ko bolta hai: *"Is cookie ko JavaScript (`document.cookie`) se access mat karne do!"*
- Browser is cookie ko automatic background mein request ke saath bhejta hai. XSS attack se token leak nahi hota!

### CSRF Defense (Cross-Site Request Forgery):
- Cookie ke saath CSRF ka risk hota hai. Isko hum do tarike se protect karte hain:
  1. `SameSite=Lax` flag (Third-party websites se cross-origin requests par cookie automatically send nahi hoti).
  2. Django CSRF Token check on mutating requests.

---

## 7. Token Rotation aur Blacklisting

### Problem:
Agar kisi tarah refresh token compromise ho gaya toh?

### Solution — Token Rotation:
1. User refresh token bhejta hai `/api/v1/auth/token/refresh/`.
2. Backend purana refresh token verify karta hai.
3. Backend **purane refresh token ko blacklist** (invalid) kar deta hai database table `token_blacklist_blacklistedtoken` mein.
4. Backend ek **naya refresh token** aur ek **naya access token** issue karta hai.
5. Agar koi attacker purana chori kiya hua refresh token dubara use karne ki koshish karega, toh blacklist check fail hoga aur server alert ho jayega (Family Revocation).

---

## 8. Anti-Enumeration Attack Prevention

### Problem (User Enumeration):
Attacker login page par script chalata hai 10,000 emails ke saath:
- Input `admin@company.com` → Response: *"Password incorrect"* (Attacker samajh gaya email exist karti hai!).
- Input `fake@company.com` → Response: *"User not found"* (Attacker ko pata chal gaya email nahi hai).

Ab attacker ko company ke valid email addresses ki list mil gayi phishing ya brute-force karne ke liye!

### Solution (TaskFlow Implementation):
Humein dono cases mein **exact same generic response** dena hai:
```json
{
  "detail": "Invalid email or password."
}
```
HTTP status code bhi same hoga: `401 Unauthorized`. Attacker determine nahi kar sakta ki email galat thi ya password.

---

## 9. Rate Limiting (Brute-Force Defense)

### Attack:
Attacker ek script se 1 second mein 1,000 login passwords try karta hai (Brute-force dictionary attack).

### Defense:
Humne `django-ratelimit` configure kiya:
```python
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def login_view(request):
    ...
```
Agar 1 minute mein 1 IP se 5 se zyada failed login attempts aaye, toh server turant `429 Too Many Requests` return kar deta hai aur database tak request hi nahi pahunchti!

---

## 10. Service Layer Pattern (Separation of Concerns)

### Dirty Architecture (Fat Views):
Views ke andar hi user create karna, validation karna, token issue karna, audit log likhna. Is se views test karna aur reuse karna impossible ho jata hai.

### Enterprise Architecture (Skinny Views, Fat Services):
```
Request 
  ──> View (HTTP parsing, calling serializer)
        ──> Serializer (Validation: email format, password strength)
              ──> Service Layer (`services.py`) (Business logic, transactions, atomic execution)
                    ──> Model (Database interactions)
```

**Kyun?**
- `services.create_user()` ko kal ko hum CLI command, Celery background worker, ya GraphQL se bhi call kar sakte hain bina HTTP request mock kiye!
- `@transaction.atomic` service layer par lagta hai, ensures all-or-nothing execution.

---

## 11. Interview Questions & Instant Cheatsheet

### Q1: Why did you choose email over username for TaskFlow?
> **Answer:** "Modern enterprise SaaS applications (like Jira, Linear, Slack) identify professionals by corporate email, not custom handles. In Django, migrating from username to email after initial migration is complex and risky, so we implemented `AbstractBaseUser` with `USERNAME_FIELD = 'email'` before running the first migration."

### Q2: Why use UUID over integer ID?
> **Answer:** "Integer auto-increment IDs suffer from sequential enumeration, revealing tenant volume and exposing APIs to IDOR (Insecure Direct Object Reference) guessing attacks. UUIDv4 is 128-bit collision-resistant, unguessable, and facilitates distributed DB generation without central sequence bottleneck."

### Q3: How do you prevent XSS stealing your authentication tokens?
> **Answer:** "We never store refresh tokens in localStorage or sessionStorage. Refresh tokens are stored in `HttpOnly, Secure, SameSite=Lax` cookies, which the browser's JavaScript execution engine cannot access. Access tokens are kept purely in frontend memory (Zustand state) with a short 15-minute TTL."

### Q4: What happens when a user logs out?
> **Answer:** "Unlike naive JWT implementations that only delete tokens on the client, our `LogoutView` extracts the refresh token from the cookie, pushes its `jti` (unique token ID) into Django's SimpleJWT token blacklist database table, and clears the client cookie with an expired `Set-Cookie` header. Any further refresh attempts with that token fail immediately."

---
*Created for TaskFlow Core Learning & Interview Preparation.*
