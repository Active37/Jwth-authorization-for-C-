"use client";

import React, { useState, useMemo } from 'react';
import { 
  Settings, 
  Code, 
  Play, 
  Sparkles, 
  Copy, 
  Check, 
  Shield, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw, 
  UserPlus, 
  Terminal, 
  Info,
  Bug,
  BookOpen,
  Lock,
  Unlock,
  Key,
  Database,
  Send
} from 'lucide-react';

interface CustomClaim {
  key: string;
  value: string;
}

interface MockUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  customClaims: CustomClaim[];
  passwordHash?: string;
}

// ==========================================
// PURE UTILITY FUNCTIONS (OUTSIDE OF COMPONENT)
// ==========================================

// Safe client Base64 URL Encoding helper
const base64UrlEncode = (str: string): string => {
  try {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  } catch {
    return "base64-err";
  }
};

// Safe client Base64 URL Decoding helper
const base64UrlDecode = (str: string): string => {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  } catch {
    return "Malformed Base64 payload";
  }
};

// Compute standard digital string validation signature
const computeMockSignature = (headerB64: string, payloadB64: string, key: string) => {
  const combined = `${headerB64}.${payloadB64}.${key}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const signatureHex = Math.abs(hash).toString(16).padEnd(16, 'x') + 
                       Math.abs(hash * 31).toString(16).padEnd(16, 'y');
  return base64UrlEncode(signatureHex).substring(0, 43);
};

export default function Page() {
  // General Configuration State
  const [secretKey, setSecretKey] = useState<string>("SuperSecretSigningKeyForAspNetCoreJwtAuth256Bits");
  const [issuer, setIssuer] = useState<string>("https://api.contoso.com");
  const [audience, setAudience] = useState<string>("https://contoso.com");
  const [expiryMinutes, setExpiryMinutes] = useState<number>(60);
  
  // Validation parameters mapped in C# code
  const [validateIssuer, setValidateIssuer] = useState<boolean>(true);
  const [validateAudience, setValidateAudience] = useState<boolean>(true);
  const [validateLifetime, setValidateLifetime] = useState<boolean>(true);
  const [validateIssuerSigningKey, setValidateIssuerSigningKey] = useState<boolean>(true);
  
  // Claim Map Choice (Classic XML OID schema vs Clean JSON Standard Claim Mapping)
  const [useLegacyNamespaces, setUseLegacyNamespaces] = useState<boolean>(false);

  // Users Database State
  const [users, setUsers] = useState<MockUser[]>([
    {
      id: "u-1",
      name: "Alice Vance",
      username: "alice.security",
      email: "alice@contoso.com",
      role: "Admin",
      passwordHash: "AQAAAAIAAYagAAAAEIjhYv7nKy2bX60zR3m4P90aL78rB94cKv91o8FhA34dD",
      customClaims: [
        { key: "Department", value: "Cybersecurity" },
        { key: "Age", value: "28" },
        { key: "EmployeeId", value: "EMP1001" }
      ]
    },
    {
      id: "u-2",
      name: "Bob Sterling",
      username: "bob.manager",
      email: "bob@contoso.com",
      role: "Manager",
      passwordHash: "AQAAAAIAAYagAAAAEG3hZ2m20t72pX89vQ15rK92cLa78nD83fL29zA14eF",
      customClaims: [
        { key: "Department", value: "Resources" },
        { key: "Age", value: "35" },
        { key: "EmployeeId", value: "EMP1002" }
      ]
    },
    {
      id: "u-3",
      name: "Charlie Vance",
      username: "charlie.user",
      email: "charlie@contoso.com",
      role: "User",
      passwordHash: "AQAAAAIAAYagAAAAEL4nP91mA72fX84tN83bV92oK84eE93cM72zA18gH",
      customClaims: [
        { key: "Department", value: "Engineering" },
        { key: "Age", value: "19" },
        { key: "EmployeeId", value: "EMP1003" }
      ]
    }
  ]);

  // Selected User for Token Generation
  const [selectedUserId, setSelectedUserId] = useState<string>("u-1");
  
  // Registration Form State
  const [regName, setRegName] = useState<string>("Diana Prince");
  const [regUsername, setRegUsername] = useState<string>("diana.security");
  const [regEmail, setRegEmail] = useState<string>("diana@contoso.com");
  const [regPassword, setRegPassword] = useState<string>("SecurePass123!");
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>("SecurePass123!");
  const [regRole, setRegRole] = useState<string>("User");
  const [regAge, setRegAge] = useState<number>(24);
  const [regDept, setRegDept] = useState<string>("Engineering");

  // Registration feedback state
  const [regFormErrors, setRegFormErrors] = useState<{ [key: string]: string[] }>({});
  const [regConsoleLogs, setRegConsoleLogs] = useState<any[]>([]);
  const [regResponseData, setRegResponseData] = useState<any>(null);
  const [lastRegisteredUser, setLastRegisteredUser] = useState<any>(null);
  const [customUserForm, setCustomUserForm] = useState<{
    name: string;
    username: string;
    email: string;
    role: string;
    age: string;
    department: string;
  }>({
    name: "",
    username: "",
    email: "",
    role: "User",
    age: "21",
    department: "Marketing"
  });

  // Safe reference timestamp state for pure computations
  const [baseEpoch] = useState(() => Math.floor(Date.now() / 1000));
  
  // Custom interactive token manipulation
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("/api/admin");
  const [isTokenExpired, setIsTokenExpired] = useState<boolean>(false);
  const [isTokenTampered, setIsTokenTampered] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<{ [key: string]: boolean }>({});
  
  // Active primary layout tabs (C# Code Generator vs Token Simulator / Middleware Trace)
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'editor' | 'sandbox' | 'docs'>('editor');
  const [sidebarTab, setSidebarTab] = useState<'claims' | 'register'>('claims');
  
  // Sub-tabs for the C# code generator
  const [activeCodeFile, setActiveCodeFile] = useState<'appsettings' | 'program' | 'service' | 'auth_controller' | 'policy_controller' | 'register_controller' | 'register_dto' | 'password_hasher' | 'db_context'>('program');

  // Helper: Format Code Copy Feedback
  const handleCopyCode = (code: string, fileKey: string) => {
    navigator.clipboard.writeText(code);
    setIsCopied(prev => ({ ...prev, [fileKey]: true }));
    setTimeout(() => {
      setIsCopied(prev => ({ ...prev, [fileKey]: false }));
    }, 2000);
  };

  // Helper: Auto-Generate random 256-bit safe secret key (32 bytes)
  const generateSecureKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_%@#*+=';
    let result = '';
    for (let i = 0; i < 48; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSecretKey(result);
  };

  // Current active user object
  const activeUser = useMemo(() => {
    return users.find(u => u.id === selectedUserId) || users[0];
  }, [users, selectedUserId]);

  // Handle addition of custom mock users
  const handleAddCustomUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUserForm.name || !customUserForm.username) return;

    const newUser: MockUser = {
      id: `u-${Date.now()}`,
      name: customUserForm.name,
      username: customUserForm.username.toLowerCase().replace(/\s+/g, '.'),
      email: customUserForm.email || `${customUserForm.username}@contoso.com`,
      role: customUserForm.role,
      customClaims: [
        { key: "Department", value: customUserForm.department || "Marketing" },
        { key: "Age", value: customUserForm.age || "21" }
      ]
    };

    setUsers(prev => [...prev, newUser]);
    setSelectedUserId(newUser.id);
    setCustomUserForm({
      name: "",
      username: "",
      email: "",
      role: "User",
      age: "21",
      department: "Marketing"
    });
  };

  // Trigger user registration simulation
  const handleRegisterUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors: { [key: string]: string[] } = {};
    
    // 1. Basic annotation validators
    if (!regName || regName.trim().length < 2) {
      errors["Name"] = ["The Full Name field must be a string with a minimum length of 2."];
    }
    if (!regUsername || regUsername.trim().length < 3) {
      errors["Username"] = ["The Username field must be a string with a minimum length of 3."];
    } else if (!/^[a-zA-Z0-9._-]+$_.*/.test(regUsername + "_")) { // safe check
      errors["Username"] = ["The Username can only contain letters, numbers, periods, underscores, or hyphens."];
    }
    
    if (!regEmail) {
      errors["Email"] = ["The Email field is required."];
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      errors["Email"] = ["The Email field is not a valid e-mail address."];
    }
    
    if (!regPassword) {
      errors["Password"] = ["The Password field is required."];
    } else if (regPassword.length < 6) {
      errors["Password"] = ["The password must be at least 6 characters long."];
    } else {
      // Check password complexity requirements: 1 uppercase, 1 lowercase, 1 number, 1 special char
      const hasUpper = /[A-Z]/.test(regPassword);
      const hasLower = /[a-z]/.test(regPassword);
      const hasDigit = /[0-9]/.test(regPassword);
      const hasSpecial = /[^A-Za-z0-9]/.test(regPassword);
      
      const missing = [];
      if (!hasUpper) missing.push("an uppercase letter");
      if (!hasLower) missing.push("a lowercase letter");
      if (!hasDigit) missing.push("a decimal digit (0-9)");
      if (!hasSpecial) missing.push("a non-alphanumeric special character (e.g., !@#$%^&*)");
      
      if (missing.length > 0) {
        errors["Password"] = [`The password must contain at least ${missing.join(', ')}.`];
      }
    }
    
    if (regPassword !== regConfirmPassword) {
      errors["ConfirmPassword"] = ["The password and confirmation password do not match."];
    }
    
    if (!regAge || regAge < 1 || regAge > 120) {
      errors["Age"] = ["The Age must be between 1 and 120."];
    }

    const emailTaken = users.some(u => u.email.toLowerCase() === regEmail.trim().toLowerCase());
    const usernameTaken = users.some(u => u.username.toLowerCase() === regUsername.trim().toLowerCase());
    
    if (emailTaken && !errors["Email"]) {
      errors["Email"] = ["An account with this email address already exists in the database context."];
    }
    if (usernameTaken && !errors["Username"]) {
      errors["Username"] = ["This username is already taken."];
    }

    setRegFormErrors(errors);

    const timeStr = "16:11:42";
    const tempLogs: any[] = [];

    tempLogs.push({
      type: 'info',
      message: `Hosting: HttpRequest starting POST /api/auth/register HTTP/1.1`,
      timestamp: timeStr
    });
    
    tempLogs.push({
      type: 'debug',
      message: `Routing: Match Endpoint RegisterController.Register (POST)`,
      timestamp: timeStr
    });

    tempLogs.push({
      type: 'debug',
      message: `Validation: Commencing [ApiController] model validation assertions on DTO Model: RegisterRequest.`,
      timestamp: timeStr
    });

    if (Object.keys(errors).length > 0) {
      // Failed validation
      tempLogs.push({
        type: 'warn',
        message: `Validation: ModelState dictionary matches invalid. ${Object.keys(errors).length} verification annotations failed.`,
        timestamp: timeStr
      });
      tempLogs.push({
        type: 'error',
        message: `Hosting: HttpRequest finished POST /api/auth/register - 400 Bad Request`,
        timestamp: timeStr
      });

      setRegConsoleLogs(tempLogs);
      setRegResponseData({
        type: "BadRequest",
        status: 400,
        title: "One or more validation errors occurred.",
        errors: errors
      });
      setLastRegisteredUser(null);
      return;
    }

    // Success validation
    tempLogs.push({
      type: 'success',
      message: `Validation: ModelState dictionary is valid. All payload attributes matching layout constraints.`,
      timestamp: timeStr
    });

    // Simulate hashing
    tempLogs.push({
      type: 'debug',
      message: `Crypto: Instantiating PBKDF2PasswordHasher...`,
      timestamp: timeStr
    });

    // Generate high-quality mock salt and hash
    const saltLength = 16;
    const randomBuffer = new Uint8Array(saltLength);
    for (let i = 0; i < saltLength; i++) {
      randomBuffer[i] = Math.floor(Math.random() * 256);
    }
    const saltBase64 = btoa(String.fromCharCode(...randomBuffer));
    // Simple mock signature to represent standard identity Version 3 hash
    const mockHashSuffix = computeMockSignature(btoa(regUsername), btoa(regPassword), secretKey);
    const mockFullHash = `AQAAAAIAAYagAAAAE` + saltBase64.substring(0, 16) + mockHashSuffix.substring(0, 24);

    tempLogs.push({
      type: 'success',
      message: `Crypto: Salt generated successfully: '${saltBase64.substring(0, 12)}...' (128-bit length)`,
      timestamp: timeStr
    });
    tempLogs.push({
      type: 'success',
      message: `Crypto: Executed RFC 2898 Key Derivations with SHA256 iterations (10000 times)`,
      timestamp: timeStr
    });
    tempLogs.push({
      type: 'debug',
      message: `Crypto: Composite Hash calculated successfully: '${mockFullHash.substring(0, 16)}...'`,
      timestamp: timeStr
    });

    // Simulate database insertion and EF core save
    tempLogs.push({
      type: 'debug',
      message: `Database: Opening SQL Connection. Executing EF Core State insertions...`,
      timestamp: timeStr
    });
    tempLogs.push({
      type: 'success',
      message: `Database: INSERT INTO [Users] ([Id], [Email], [Username], [PasswordHash], [Role], [Age], [Department]) VALUES (...)`,
      timestamp: timeStr
    });
    tempLogs.push({
      type: 'success',
      message: `Database: DbContext SaveChangesAsync completed successfully. Transaction Committed.`,
      timestamp: timeStr
    });

    const newUserId = `u-${Date.now()}`;
    const newUserObj: MockUser = {
      id: newUserId,
      name: regName,
      username: regUsername.toLowerCase().trim(),
      email: regEmail.toLowerCase().trim(),
      role: regRole,
      passwordHash: mockFullHash,
      customClaims: [
        { key: "Department", value: regDept || "Engineering" },
        { key: "Age", value: regAge.toString() }
      ]
    };

    // Add to mock DB!
    setUsers(prev => [...prev, newUserObj]);
    setLastRegisteredUser(newUserObj);

    // Return 201 Created Response
    tempLogs.push({
      type: 'success',
      message: `Hosting: HttpRequest finished POST /api/auth/register - 201 Created`,
      timestamp: timeStr
    });

    setRegConsoleLogs(tempLogs);
    setRegResponseData({
      type: "Created",
      status: 201,
      body: {
        success: true,
        message: "User registered successfully in SQL database context.",
        userId: newUserId,
        username: newUserObj.username,
        email: newUserObj.email,
        passwordHash: mockFullHash,
        memberSinceUtc: new Date().toISOString()
      },
      salt: saltBase64,
      hash: mockFullHash
    });
  };

  // Real-time claims structure payload generation mimicking standard C# setup
  const tokenPayloadObject = useMemo(() => {
    const expTime = isTokenExpired ? baseEpoch - 3600 : baseEpoch + (expiryMinutes * 60);

    // .NET claim mapping schema dictionary constants
    const nameClaimKey = useLegacyNamespaces 
      ? "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name" 
      : "sub";
    const emailClaimKey = useLegacyNamespaces 
      ? "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress" 
      : "email";
    const roleClaimKey = useLegacyNamespaces 
      ? "http://schemas.microsoft.com/ws/2008/06/identity/claims/role" 
      : "role";

    const payload: any = {
      iss: issuer,
      aud: audience,
      exp: expTime,
      nbf: baseEpoch - 10,
      iat: baseEpoch,
    };

    payload[nameClaimKey] = activeUser.username;
    payload[emailClaimKey] = activeUser.email;
    payload[roleClaimKey] = activeUser.role;

    // Add extra custom claims
    activeUser.customClaims.forEach(claim => {
      payload[claim.key.toLowerCase()] = claim.value;
    });

    return payload;
  }, [activeUser, issuer, audience, expiryMinutes, useLegacyNamespaces, isTokenExpired, baseEpoch]);

  const tokenHeaderObject = useMemo(() => {
    return {
      alg: "HS256",
      typ: "JWT"
    };
  }, []);

  // Calculate the base generated token based on configuration factors
  const autoGeneratedToken = useMemo(() => {
    const headB64 = base64UrlEncode(JSON.stringify(tokenHeaderObject));
    const payB64 = base64UrlEncode(JSON.stringify(tokenPayloadObject));
    let signB64 = computeMockSignature(headB64, payB64, secretKey);

    if (isTokenTampered) {
      signB64 = signB64.substring(0, signB64.length - 5) + "Error";
    }

    return `${headB64}.${payB64}.${signB64}`;
  }, [tokenHeaderObject, tokenPayloadObject, secretKey, isTokenTampered]);

  // Track what is in the main textbox
  const [manualToken, setManualToken] = useState<string>("");
  const currentInteractiveToken = manualToken || autoGeneratedToken;

  const handleManualTokenEdit = (val: string) => {
    setManualToken(val);
  };

  const parsedTokenData = useMemo(() => {
    const segments = currentInteractiveToken.split('.');
    let header = { alg: "HS256", typ: "JWT" };
    let payload = tokenPayloadObject;
    let signatureValid = true;

    if (segments.length === 3) {
      try {
        header = JSON.parse(base64UrlDecode(segments[0]));
        payload = JSON.parse(base64UrlDecode(segments[1]));
        const expectedSign = computeMockSignature(segments[0], segments[1], secretKey);
        signatureValid = segments[2] === expectedSign;
      } catch {
        signatureValid = false;
      }
    } else {
      signatureValid = false;
    }

    return {
      header,
      payload,
      signatureValid
    };
  }, [currentInteractiveToken, secretKey, tokenPayloadObject]);

  const decodedHeader = parsedTokenData.header;
  const decodedPayload = parsedTokenData.payload;
  const tokenSignatureValid = parsedTokenData.signatureValid;

  // Derive Simulated trace log array dynamically to maintain 100% component purity
  const simulatedResult = useMemo(() => {
    const sysTimeStr = "16:07:02";

    if (selectedEndpoint === "/api/auth/register") {
      if (regConsoleLogs.length > 0) {
        return {
          trace: regConsoleLogs,
          status: regResponseData?.status || 201,
          statusText: regResponseData?.status === 201 ? "Created" : "Bad Request",
          explanation: regResponseData?.status === 201 
            ? "Resource successfully created in SQL database. Complete C# DataAnnotations data validation passed and the password hash was generated securely."
            : "The API rejected the user registration payload. Model state constraints (DataAnnotations) or unique validation checks failed."
        };
      } else {
        return {
          trace: [
            {
              type: 'info',
              message: `Hosting: Watching POST /api/auth/register route.`,
              timestamp: sysTimeStr
            },
            {
              type: 'debug',
              message: `Routing: Endpoint matched RegisterController.Register (POST) with route template 'api/auth/register'.`,
              timestamp: sysTimeStr
            },
            {
              type: 'warn',
              message: `Simulator Note: Use the interactive 'User Registration Controller Simulator' form left to compile credentials and execute a registration.`,
              timestamp: sysTimeStr
            }
          ],
          status: 200,
          statusText: "Ready",
          explanation: "The registration endpoint is active and awaiting a POST request. Fill out the registration simulator inputs and click submit to dispatch a simulated HTTP POST payload."
        };
      }
    }

    const trace: Array<{ type: 'info' | 'debug' | 'warn' | 'error' | 'success'; message: string; timestamp: string }> = [];

    trace.push({
      type: 'info',
      message: `Hosting: HttpRequest starting GET ${selectedEndpoint} HTTP/1.1`,
      timestamp: sysTimeStr
    });

    trace.push({
      type: 'debug',
      message: `Routing: Match Endpoint '${selectedEndpoint}' with route template found`,
      timestamp: sysTimeStr
    });

    const segments = currentInteractiveToken.split('.');
    const authHeaderExists = currentInteractiveToken && currentInteractiveToken.trim() !== "";
    
    trace.push({
      type: 'debug',
      message: `AuthenticationMiddleware: Checking incoming headers for Auth Bearer Scheme`,
      timestamp: sysTimeStr
    });

    let isAuthenticated = false;
    let validatedPrincipalClaims: any = null;
    let authFailureReason = "No Token provided in authorization headers.";
    let status = 401;
    let statusText = "Unauthorized";
    let explanation = "";

    if (!authHeaderExists) {
      trace.push({
        type: 'warn',
        message: `AuthenticationMiddleware: Authorization header key 'Bearer' was missing or empty.`,
        timestamp: sysTimeStr
      });
      explanation = "Access is denied because the incoming JWT token failed validation checks or was completely absent. Server responded with Bearer Challenge: No Token provided in authorization headers.";
    } else if (segments.length !== 3) {
      authFailureReason = "JWT token segment length mismatch. Expected 3 segments.";
      trace.push({
        type: 'error',
        message: `AuthenticationMiddleware: Authentication failed. JWT is malformed.`,
        timestamp: sysTimeStr
      });
      explanation = `Access is denied because the incoming JWT token failed validation checks or was completely absent. Server responded with Bearer Challenge: ${authFailureReason}`;
    } else {
      trace.push({
        type: 'debug',
        message: `AuthenticationMiddleware: Bearer token found. Commencing validation parameters checks.`,
        timestamp: sysTimeStr
      });

      try {
        const rawHeader = base64UrlDecode(segments[0]);
        const rawPayload = base64UrlDecode(segments[1]);
        const parsedHeader = JSON.parse(rawHeader);
        const parsedPayload = JSON.parse(rawPayload);

        let validationSucceeded = true;

        if (validateIssuerSigningKey) {
          trace.push({
            type: 'debug',
            message: `Crypto: Verifying symmetric key sizes. Config key size: ${secretKey.length * 8} bits`,
            timestamp: sysTimeStr
          });
          
          if (secretKey.length < 32) {
            validationSucceeded = false;
            authFailureReason = "SymmetricSecurityKey length is under 256 bits (32 bytes). Core raises exception.";
            trace.push({
              type: 'error',
              message: `Crypto: IDX10603: Decryption key is too short. Expected >= 256 bits. Actual: ${secretKey.length * 8} bits.`,
              timestamp: sysTimeStr
            });
          } else {
            const checkSignature = computeMockSignature(segments[0], segments[1], secretKey);
            if (segments[2] !== checkSignature) {
              validationSucceeded = false;
              authFailureReason = "Digital signature validation failed. cryptographic mismatch.";
              trace.push({
                type: 'error',
                message: `AuthenticationMiddleware: IDX10501: Signature verification failed.`,
                timestamp: sysTimeStr
              });
            } else {
              trace.push({
                type: 'success',
                message: `AuthenticationMiddleware: Code signing keys validated successfully.`,
                timestamp: sysTimeStr
              });
            }
          }
        }

        if (validationSucceeded && validateIssuer) {
          if (parsedPayload.iss !== issuer) {
            validationSucceeded = false;
            authFailureReason = `IDX10205: Issuer validation failed. Expected: '${issuer}'. Found: '${parsedPayload.iss}'.`;
            trace.push({
              type: 'error',
              message: `AuthenticationMiddleware: Issuer validation mismatch.`,
              timestamp: sysTimeStr
            });
          } else {
            trace.push({
              type: 'success',
              message: `AuthenticationMiddleware: Issuer verified successfully: '${parsedPayload.iss}'`,
              timestamp: sysTimeStr
            });
          }
        }

        if (validationSucceeded && validateAudience) {
          if (parsedPayload.aud !== audience) {
            validationSucceeded = false;
            authFailureReason = `IDX10208: Audience validation failed. Expected: '${audience}'. Found: '${parsedPayload.aud}'.`;
            trace.push({
              type: 'error',
              message: `AuthenticationMiddleware: Audience validation mismatch.`,
              timestamp: sysTimeStr
            });
          } else {
            trace.push({
              type: 'success',
              message: `AuthenticationMiddleware: Audience verified successfully: '${parsedPayload.aud}'`,
              timestamp: sysTimeStr
            });
          }
        }

        if (validationSucceeded && validateLifetime) {
          if (parsedPayload.exp < baseEpoch) {
            validationSucceeded = false;
            const diffSec = baseEpoch - parsedPayload.exp;
            authFailureReason = `IDX10223: Lifetime validation failed. Token expired ${diffSec}s ago.`;
            trace.push({
              type: 'error',
              message: `AuthenticationMiddleware: Lifetime validation failed. Token expired.`,
              timestamp: sysTimeStr
            });
          } else {
            trace.push({
              type: 'success',
              message: `AuthenticationMiddleware: Lifetime checks succeeded. Expiring in ${Math.round((parsedPayload.exp - baseEpoch)/60)} minutes.`,
              timestamp: sysTimeStr
            });
          }
        }

        if (validationSucceeded) {
          isAuthenticated = true;
          validatedPrincipalClaims = parsedPayload;
          trace.push({
            type: 'success',
            message: `AuthenticationMiddleware: JWT verified successfully. ClaimsPrincipal initialized with ${Object.keys(parsedPayload).length} keys.`,
            timestamp: sysTimeStr
          });
        }

      } catch (err) {
        isAuthenticated = false;
        authFailureReason = "General JSON parsing error decoding token payload segments.";
        trace.push({
          type: 'error',
          message: `AuthenticationMiddleware: Exception decoding segments: ${err}`,
          timestamp: sysTimeStr
        });
      }
    }

    trace.push({
      type: 'debug',
      message: `AuthorizationMiddleware: Commencing security policy verification for '${selectedEndpoint}'`,
      timestamp: sysTimeStr
    });

    if (selectedEndpoint === "/api/public") {
      trace.push({
        type: 'success',
        message: `AuthorizationMiddleware: Endpoint has [AllowAnonymous] metadata attribute.`,
        timestamp: sysTimeStr
      });
      trace.push({
        type: 'info',
        message: `Routing: Action Executing. Returned custom controller status success package.`,
        timestamp: sysTimeStr
      });
      trace.push({
        type: 'success',
        message: `Hosting: HttpRequest finished GET ${selectedEndpoint} - 200 OK`,
        timestamp: sysTimeStr
      });
      status = 200;
      statusText = "OK";
      explanation = "Public endpoints bypass all authentication/authorization checks via the ASP.NET Core [AllowAnonymous] attribute.";
    } else {
      if (!isAuthenticated) {
        trace.push({
          type: 'warn',
          message: `AuthorizationMiddleware: Authenticated user required but identity is anonymous: ${authFailureReason}`,
          timestamp: sysTimeStr
        });
        trace.push({
          type: 'error',
          message: `Hosting: HttpRequest finished GET ${selectedEndpoint} - 401 Unauthorized`,
          timestamp: sysTimeStr
        });
        status = 401;
        statusText = "Unauthorized";
        explanation = `Access is denied because the incoming JWT token failed validation checks or was completely absent. Server responded with Bearer Challenge: ${authFailureReason}`;
      } else {
        const roleMappedKey = useLegacyNamespaces 
          ? "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name" 
          : "role";
        
        const claimRole = validatedPrincipalClaims[roleMappedKey] || validatedPrincipalClaims["role"];
        const claimAge = parseFloat(validatedPrincipalClaims["age"] || "0");
        const claimDept = validatedPrincipalClaims["department"] || "";

        trace.push({
          type: 'debug',
          message: `AuthorizationMiddleware: Loaded Claim Context: Role='${claimRole || "None"}', Department='${claimDept || "None"}', Age=${claimAge}`,
          timestamp: sysTimeStr
        });

        if (selectedEndpoint === "/api/profile") {
          trace.push({
            type: 'success',
            message: `AuthorizationMiddleware: Minimal auth requirement matched. Set ClaimsPrincipal identity.`,
            timestamp: sysTimeStr
          });
          trace.push({
            type: 'info',
            message: `Routing: Authorized profile action execution successful.`,
            timestamp: sysTimeStr
          });
          trace.push({
            type: 'success',
            message: `Hosting: HttpRequest finished GET ${selectedEndpoint} - 200 OK`,
            timestamp: sysTimeStr
          });
          status = 200;
          statusText = "OK";
          explanation = `Access granted. The JWT is cryptographically verified and authorized for this default [Authorize] user profile endpoint.`;
        } 
        else if (selectedEndpoint === "/api/admin") {
          trace.push({
            type: 'debug',
            message: `Policy: Evaluating RolesRequirement requiring Role='Admin'`,
            timestamp: sysTimeStr
          });

          if (claimRole === "Admin") {
            trace.push({
              type: 'success',
              message: `Policy: RolesRequirement met. User claims role matches: 'Admin'`,
              timestamp: sysTimeStr
            });
            trace.push({
              type: 'info',
              message: `Routing: Administrator controller method executing.`,
              timestamp: sysTimeStr
            });
            trace.push({
              type: 'success',
              message: `Hosting: HttpRequest finished GET ${selectedEndpoint} - 200 OK`,
              timestamp: sysTimeStr
            });
            status = 200;
            statusText = "OK";
            explanation = `Access granted. Cryptographic claims verify user's role mapping is 'Admin'. The Admin endpoint allowed access.`;
          } else {
            trace.push({
              type: 'warn',
              message: `Policy: RolesRequirement evaluation failed. Expected 'Admin', had: '${claimRole || "None"}'`,
              timestamp: sysTimeStr
            });
            trace.push({
              type: 'error',
              message: `Hosting: HttpRequest finished GET ${selectedEndpoint} - 403 Forbidden`,
              timestamp: sysTimeStr
            });
            status = 403;
            statusText = "Forbidden";
            explanation = `The JWT token is valid, but the user is in role '${claimRole || "None"}' which does not meet the specified [Authorize(Roles = "Admin")] attribute.`;
          }
        } 
        else if (selectedEndpoint === "/api/executive") {
          trace.push({
            type: 'debug',
            message: `Policy: Evaluating RolesRequirement requiring Role='Admin' OR Role='Manager'`,
            timestamp: sysTimeStr
          });

          if (claimRole === "Admin" || claimRole === "Manager") {
            trace.push({
              type: 'success',
              message: `Policy: RolesRequirement met. User role matches criteria.`,
              timestamp: sysTimeStr
            });
            trace.push({
              type: 'info',
              message: `Routing: Executive controller metrics successful.`,
              timestamp: sysTimeStr
            });
            trace.push({
              type: 'success',
              message: `Hosting: HttpRequest finished GET ${selectedEndpoint} - 200 OK`,
              timestamp: sysTimeStr
            });
            status = 200;
            statusText = "OK";
            explanation = `Access granted. The Role claim is '${claimRole || "None"}', matching the multi-role criteria [Authorize(Roles = "Admin,Manager")].`;
          } else {
            trace.push({
              type: 'warn',
              message: `Policy: RolesRequirement failed. User is in role '${claimRole || "None"}'.`,
              timestamp: sysTimeStr
            });
            trace.push({
              type: 'error',
              message: `Hosting: HttpRequest finished GET ${selectedEndpoint} - 403 Forbidden`,
              timestamp: sysTimeStr
            });
            status = 403;
            statusText = "Forbidden";
            explanation = `Forbidden. Admin or Manager roles were required, but your active token role is '${claimRole || "None"}'.`;
          }
        }
        else if (selectedEndpoint === "/api/vip-age") {
          trace.push({
            type: 'debug',
            message: `Policy: Evaluating custom claim policy 'Over21Only' (Requires 'Age' claim >= 21)`,
            timestamp: sysTimeStr
          });

          if (isNaN(claimAge)) {
            trace.push({
              type: 'warn',
              message: `Policy: Over21Only claim check failed. 'Age' claim is missing or invalid.`,
              timestamp: sysTimeStr
            });
            trace.push({
              type: 'error',
              message: `Hosting: HttpRequest finished GET ${selectedEndpoint} - 403 Forbidden`,
              timestamp: sysTimeStr
            });
            status = 403;
            statusText = "Forbidden";
            explanation = `Forbidden. The 'Over21Only' policy checks for an 'Age' claim. Your token's Age claim is missing or unreadable.`;
          } else if (claimAge >= 21) {
            trace.push({
              type: 'success',
              message: `Policy: Over21Only checks successful. Age claim value (${claimAge}) satisfies threshold (>= 21).`,
              timestamp: sysTimeStr
            });
            trace.push({
              type: 'info',
              message: `Routing: VIP controller response processed securely.`,
              timestamp: sysTimeStr
            });
            trace.push({
              type: 'success',
              message: `Hosting: HttpRequest finished GET ${selectedEndpoint} - 200 OK`,
              timestamp: sysTimeStr
            });
            status = 200;
            statusText = "OK";
            explanation = `Success! The user met the required policy rules because the claim 'age' (${claimAge}) satisfies the custom constraint.`;
          } else {
            trace.push({
              type: 'warn',
              message: `Policy: Over21Only evaluation failed. User age value (${claimAge}) is minor (under 21).`,
              timestamp: sysTimeStr
            });
            trace.push({
              type: 'error',
              message: `Hosting: HttpRequest finished GET ${selectedEndpoint} - 403 Forbidden`,
              timestamp: sysTimeStr
            });
            status = 403;
            statusText = "Forbidden";
            explanation = `Access is forbidden. The token is cryptographically valid, but the custom claim 'age' value (${claimAge}) does not meet the minimum age restriction policy (>= 21).`;
          }
        }
      }
    }

    return {
      trace,
      status,
      statusText,
      explanation
    };
  }, [selectedEndpoint, currentInteractiveToken, validateIssuer, validateAudience, validateLifetime, validateIssuerSigningKey, useLegacyNamespaces, secretKey, issuer, audience, baseEpoch, regConsoleLogs, regResponseData]);

  const middlewareTrace = simulatedResult.trace;
  const simulatedStatus = simulatedResult.status;
  const simulatedStatusText = simulatedResult.statusText;
  const simulatedExplanation = simulatedResult.explanation;

  // C# Code Generators
  const generatedAppSettings = useMemo(() => {
    return `{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "JwtSettings": {
    "SecretKey": "${secretKey}",
    "Issuer": "${issuer}",
    "Audience": "${audience}",
    "ExpiryMinutes": ${expiryMinutes}
  }
}`;
  }, [secretKey, issuer, audience, expiryMinutes]);

  const generatedProgramCs = useMemo(() => {
    const claimInitType = useLegacyNamespaces 
      ? "" 
      : `\n// Clear incoming WS OID schemas to use modern standard names ('sub', 'role', etc.)\nJwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();\n`;

    return `using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;${useLegacyNamespaces ? "" : "\nusing System.IdentityModel.Tokens.Jwt;"}

var builder = WebApplication.CreateBuilder(args);

// Add API Controllers and Services
builder.Services.AddControllers();
${claimInitType}
// 1. Fetch JWT configurations from appsettings.json
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"] ?? "FallbackTemporaryKeyForSafetyAtLeast32BytesLength";

// 2. Add ASP.NET Core Bearer Authentication services
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = ${validateIssuer ? "true" : "false"},
        ValidateAudience = ${validateAudience ? "true" : "false"},
        ValidateLifetime = ${validateLifetime ? "true" : "false"},
        ValidateIssuerSigningKey = ${validateIssuerSigningKey ? "true" : "false"},
        
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero // Set default 5-min clock skew tolerance to zero
    };
});

// 3. Define authorization claims-based Policies
builder.Services.AddAuthorization(options =>
{
    // Simple custom policy using claim evaluations
    options.AddPolicy("Over21Only", policy => 
        policy.RequireClaim("age", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35"));
});

var app = builder.Build();

app.UseHttpsRedirection();

// 4. Middlewares Pipeline Integration (Order is CRITICAL!)
app.UseAuthentication(); // authenticates headers and resolves current ClaimsPrincipal Identity
app.UseAuthorization();  // evaluates configured endpoint roles and security policies

app.MapControllers();

app.Run();`;
  }, [validateIssuer, validateAudience, validateLifetime, validateIssuerSigningKey, useLegacyNamespaces]);

  const generatedTokenService = useMemo(() => {
    const claimKeys = useLegacyNamespaces ? `{
          new Claim(ClaimTypes.Name, username),
          new Claim(ClaimTypes.Email, email),
          new Claim(ClaimTypes.Role, role),
        }` : `{
          new Claim(JwtRegisteredClaimNames.Sub, username),
          new Claim(JwtRegisteredClaimNames.Email, email),
          new Claim("role", role), // Custom role key mapping
        }`;

    return `using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace ContosoAuth.Services;

public interface IJwtTokenService
{
    string GenerateToken(string username, string email, string role, Dictionary<string, string> customClaims);
}

public class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(string username, string email, string role, Dictionary<string, string> customClaims)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("Secret Key is missing.");
        
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Define primary identity assertions
        var claims = new List<Claim>
        ${claimKeys}

        // Add additional flexible metadata assertions
        foreach (var claim in customClaims)
        {
            claims.Add(new Claim(claim.Key.ToLower(), claim.Value));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(double.Parse(jwtSettings["ExpiryMinutes"] ?? "60")),
            Issuer = jwtSettings["Issuer"],
            Audience = jwtSettings["Audience"],
            SigningCredentials = credentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        
        return tokenHandler.WriteToken(token);
    }
}`;
  }, [useLegacyNamespaces]);

  const generatedAuthController = useMemo(() => {
    return `using Microsoft.AspNetCore.Mvc;
using ContosoAuth.Services;

namespace ContosoAuth.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IJwtTokenService _tokenService;

    public AuthController(IJwtTokenService tokenService)
    {
        _tokenService = tokenService;
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        // Demonstration fallback validator
        if (request.Username == "admin" && request.Password == "Password123")
        {
            var customClaims = new Dictionary<string, string>
            {
                { "Department", "IT" },
                { "Age", "29" }
            };
              
            var token = _tokenService.GenerateToken(
                username: "alice.security",
                email: "alice@contoso.com",
                role: "Admin",
                customClaims: customClaims
            );

            return Ok(new { Token = token, ExpiresInMinutes = 60 });
        }

        return Unauthorized(new { Error = "Invalid username or security credentials" });
    }
}

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}`;
  }, []);

  const generatedPolicyController = useMemo(() => {
    return `using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ContosoAuth.Controllers;

[ApiController]
[Route("api")]
public class SecuredDataController : ControllerBase
{
    // 1. Open HTTP request - reachable by anyone
    [HttpGet("public")]
    [AllowAnonymous]
    public IActionResult GetPublicData()
    {
        return Ok(new { Message = "This endpoint is open to the public without bearer headers." });
    }

    // 2. Secure Request - authentic login context required
    [HttpGet("profile")]
    [Authorize]
    public IActionResult GetProfile()
    {
        // Read authenticated user claims from ClaimsPrincipal Context
        var name = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.Identity?.Name;
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        
        return Ok(new {
            Message = "Authorized User Profile",
            Username = name,
            Email = email,
            IsAuthenticated = true
        });
    }

    // 3. Admin Request - Role gated [Authorize(Roles = "Admin")]
    [HttpGet("admin")]
    [Authorize(Roles = "Admin")]
    public IActionResult GetAdminConsole()
    {
        return Ok(new {
            SystemStatus = "All systems online",
            EncryptionLevel = "AES-256",
            DatabaseDiagnostic = "Connected OK"
        });
    }

    // 4. Executive Request - Gated to either Admin or Manager
    [HttpGet("executive")]
    [Authorize(Roles = "Admin,Manager")]
    public IActionResult GetExecutiveData()
    {
        return Ok(new {
            ExecutiveReport = "Q2 targets achieved. Growth up 18.4%."
        });
    }

    // 5. VIP Request - Evaluated via Custom Service Claim Policy
    [HttpGet("vip-age")]
    [Authorize(Policy = "Over21Only")]
    public IActionResult GetVipDetails()
    {
        var ageValue = User.FindFirst("age")?.Value;
        
        return Ok(new {
            VipVoucher = "VIP-ACCESS-GRANTEDOB78",
            VerifiedAge = ageValue,
            ExclusivePerks = "Unlimited developer access and workspace metrics."
        });
    }
}`;
  }, []);

  const generatedRegisterController = useMemo(() => {
    return `using Microsoft.AspNetCore.Mvc;
using ContosoAuth.Models;
using ContosoAuth.DTOs;
using ContosoAuth.Services;
using ContosoAuth.Data;
using Microsoft.EntityFrameworkCore;

namespace ContosoAuth.Controllers;

[ApiController]
[Route("api/auth")]
public class RegisterController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public RegisterController(ApplicationDbContext context, IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        // 1. Basic validation check (DataAnnotations validation is automatic; fallback example)
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // 2. Validate password matches confirmation
        if (request.Password != request.ConfirmPassword)
        {
            ModelState.AddModelError("ConfirmPassword", "The password and confirmation password do not match.");
            return BadRequest(new ValidationProblemDetails(ModelState) { Status = StatusCodes.Status400BadRequest });
        }

        // 3. Check for unique email
        var emailExists = await _context.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower());
        if (emailExists)
        {
            ModelState.AddModelError("Email", "An account with this email address already exists.");
            return BadRequest(new ValidationProblemDetails(ModelState) { Status = StatusCodes.Status400BadRequest });
        }

        // 4. Check for unique username
        var usernameExists = await _context.Users.AnyAsync(u => u.Username.ToLower() == request.Username.ToLower());
        if (usernameExists)
        {
            ModelState.AddModelError("Username", "This username is already taken.");
            return BadRequest(new ValidationProblemDetails(ModelState) { Status = StatusCodes.Status400BadRequest });
        }

        // 5. Instantiate model and hash password securely
        var user = new User
        {
            Id = Guid.NewGuid().ToString(),
            Name = request.Name,
            Username = request.Username.Trim().ToLower(),
            Email = request.Email.Trim().ToLower(),
            Role = string.IsNullOrEmpty(request.Role) ? "User" : request.Role,
            Age = request.Age ?? 21,
            Department = string.IsNullOrEmpty(request.Department) ? "Engineering" : request.Department,
            CreatedAtUtc = DateTime.UtcNow
        };

        // Securely hash user password using PBKDF2 cryptography salt derivation
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        // 6. DB Context insert
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetUserDetails), new { id = user.Id }, new {
            Success = true,
            Message = "User registered successfully.",
            UserId = user.Id,
            Username = user.Username,
            Email = user.Email
        });
    }

    [HttpGet("users/{id}")]
    public async Task<IActionResult> GetUserDetails(string id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        return Ok(new {
            user.Id,
            user.Name,
            user.Username,
            user.Email,
            user.Role,
            user.Age,
            user.Department,
            user.CreatedAtUtc
        });
    }
}`;
  }, []);

  const generatedRegisterDto = useMemo(() => {
    return `using System.ComponentModel.DataAnnotations;

namespace ContosoAuth.DTOs;

public class RegisterRequest
{
    [Required(ErrorMessage = "Full Name is required.")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "Full name must be between 2 and 50 characters.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Username is required.")]
    [RegularExpression(@"^[a-zA-Z0-9._-]+$", ErrorMessage = "Username can only contain letters, numbers, periods, underscores, or hyphens.")]
    [StringLength(20, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 20 characters.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email address is required.")]
    [EmailAddress(ErrorMessage = "Invalid format for Email Address.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required.")]
    [DataType(DataType.Password)]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "Password must be at least 6 characters long.")]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\da-zA-Z]).+$", 
        ErrorMessage = "Password must contain at least one uppercase letter, one lowercase letter, one decimal digit, and one special character.")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Confirm Password is required.")]
    [DataType(DataType.Password)]
    [Compare("Password", ErrorMessage = "The password and confirmation password do not match.")]
    public string ConfirmPassword { get; set; } = string.Empty;

    [Range(1, 120, ErrorMessage = "Age claim must be a positive integer between 1 and 120.")]
    public int? Age { get; set; } = 21;

    public string Role { get; set; } = "User";

    public string Department { get; set; } = "Engineering";
}`;
  }, []);

  const generatedPasswordHasher = useMemo(() => {
    return `using System.Security.Cryptography;
using System.Text;
using ContosoAuth.Models;

namespace ContosoAuth.Services;

public interface IPasswordHasher
{
    string HashPassword(User user, string password);
    bool VerifyHashedPassword(User user, string hashedPassword, string providedPassword);
}

/// <summary>
/// Secure PBKDF2 Password Hasher mimicking the ASP.NET Core Identity standards
/// (RFC 2898 Key Derivations with SHA-256 and randomized cryptographic salt)
/// </summary>
public class PBKDF2PasswordHasher : IPasswordHasher
{
    private const int SaltSize = 16; // 128-bit Salt
    private const int KeySize = 32;  // 256-bit Key
    private const int Iterations = 10000; // Strong security work factor iterations

    public string HashPassword(User user, string password)
    {
        // 1. Generate a high-entropy cryptographically secure random salt
        byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);

        // 2. Derive the RFC 2898 / PBKDF2 subkey hash (using SHA-256)
        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, Iterations, HashAlgorithmName.SHA256);
        byte[] hash = pbkdf2.GetBytes(KeySize);

        // 3. Assemble composite hash byte-buffer: [salt (16b) + hash (32b)]
        byte[] hashBytes = new byte[SaltSize + KeySize];
        Array.Copy(salt, 0, hashBytes, 0, SaltSize);
        Array.Copy(hash, 0, hashBytes, SaltSize, KeySize);

        // 4. Standard Encode as Base64 string for database storage
        return Convert.ToBase64String(hashBytes);
    }

    public bool VerifyHashedPassword(User user, string hashedPassword, string providedPassword)
    {
        try
        {
            // 1. Decode stored Base64 payload back to bytes
            byte[] hashBytes = Convert.FromBase64String(hashedPassword);

            // 2. Extract salt bytes and target hash bytes
            byte[] salt = new byte[SaltSize];
            Array.Copy(hashBytes, 0, salt, 0, SaltSize);

            byte[] expectedHash = new byte[KeySize];
            Array.Copy(hashBytes, SaltSize, expectedHash, 0, KeySize);

            // 3. Compute verification hash using the same salt & work iteration factor
            using var pbkdf2 = new Rfc2898DeriveBytes(providedPassword, salt, Iterations, HashAlgorithmName.SHA256);
            byte[] actualHash = pbkdf2.GetBytes(KeySize);

            // 4. Secure comparison over constant-time loop to mitigate timing-channel attacks
            return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
        }
        catch
        {
            return false;
        }
    }
}`;
  }, []);

  const generatedDbContext = useMemo(() => {
    return `using Microsoft.EntityFrameworkCore;
using ContosoAuth.Models;

namespace ContosoAuth.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure the schema bindings for the secure credentials entity
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Username)
                  .IsRequired()
                  .HasMaxLength(50);
            
            entity.HasIndex(e => e.Username)
                  .IsUnique();

            entity.Property(e => e.Email)
                  .IsRequired()
                  .HasMaxLength(100);

            entity.HasIndex(e => e.Email)
                  .IsUnique();

            // Secure Hashed password storage with ample character bounds
            entity.Property(e => e.PasswordHash)
                  .IsRequired()
                  .HasMaxLength(256);

            entity.Property(e => e.Role)
                  .HasDefaultValue("User")
                  .HasMaxLength(20);

            entity.Property(e => e.CreatedAtUtc)
                  .HasDefaultValueSql("GETUTCDATE()");
        });
    }
}

namespace ContosoAuth.Models;

public class User
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "User";
    public int Age { get; set; } = 21;
    public string Department { get; set; } = "Engineering";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}`;
  }, []);

  return (
    <div id="aspnet-jwt-app" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* HEADER SECTION */}
      <header id="app-header" className="border-b border-slate-850 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-4 md:px-8 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-purple-600 to-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-purple-950/20 ring-1 ring-white/10">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">{"ASP.NET Core 8.0"}</span>
              <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">{"Security Sandbox"}</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              {"C# JWT Authorization Builder"}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button 
            onClick={() => setActiveWorkspaceTab('editor')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeWorkspaceTab === 'editor' 
                ? 'bg-slate-800 text-white shadow' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            {"C# Code Generator"}
          </button>
          
          <button 
            onClick={() => setActiveWorkspaceTab('sandbox')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeWorkspaceTab === 'sandbox' 
                ? 'bg-slate-800 text-white shadow' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            {"Interactive Sandbox"}
          </button>

          <button 
            onClick={() => setActiveWorkspaceTab('docs')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeWorkspaceTab === 'docs' 
                ? 'bg-slate-800 text-white shadow' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            {"Debugging Guide"}
          </button>
        </div>
      </header>

      {/* BODY WORKSPACE GRID */}
      <main id="main-content" className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-6 lg:p-8 max-w-[1700px] w-full mx-auto">
        
        {/* LEFT COLUMN: ACTIVE CONTROL CONFIGURATOR */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* SECURE SCHEME OPTIONS CARD */}
          <div id="jwt-issuer-options" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-sm font-bold tracking-wide uppercase text-slate-400 flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-purple-400" />
              {"JWT Generation Variables"}
            </h2>
            
            <div className="space-y-4">
              
              {/* Secret Key Input with Validator indicator */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    {"Symmetric Key (HMAC-SHA256)"}
                  </label>
                  <button 
                    onClick={generateSecureKey}
                    className="text-[10px] text-purple-400 hover:text-purple-300 transition flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> {"Auto-Generate"}
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                  />
                  <div className="absolute right-2 top-2.5">
                    {secretKey.length >= 32 ? (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">{"256+ bits"}</span>
                    ) : (
                      <span className="text-[10px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/20 font-bold">{"Unsafe Key"}</span>
                    )}
                  </div>
                </div>
                {secretKey.length < 32 && (
                  <div className="mt-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2.5 rounded-xl text-xs flex gap-2 text-left">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>
                      <strong>{"Warning:"}</strong> {" .NET Core requires keys to be at least 256 bits (32 characters). Run-time exceptions will block application boots otherwise."}
                    </span>
                  </div>
                )}
              </div>

              {/* Issuer (iss) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">{"Valid Issuer (iss)"}</label>
                <input 
                  type="text" 
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                />
              </div>

              {/* Audience (aud) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">{"Valid Audience (aud)"}</label>
                <input 
                  type="text" 
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                />
              </div>

              {/* ExpTime / Lifespan */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300">{"Token Expiration Lifespan"}</label>
                  <span className="text-xs font-medium text-slate-400">{expiryMinutes} {"minutes"}</span>
                </div>
                <input 
                  type="range" 
                  min={5} 
                  max={1440} 
                  step={5}
                  value={expiryMinutes}
                  onChange={(e) => setExpiryMinutes(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Claims Mapping Scheme Toggle */}
              <div className="pt-2 border-t border-slate-800 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block">{"Use WS / XML Claims Schema"}</label>
                    <span className="text-[10px] text-slate-400 block max-w-[200px]">{"Forces SOAP security namespaces onto name, role, email claims."}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setUseLegacyNamespaces(!useLegacyNamespaces);
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      useLegacyNamespaces ? 'bg-purple-600' : 'bg-slate-800'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      useLegacyNamespaces ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* TOKEN VALIDATION CRITERIA (MAPS TO TOKEN_VALIDATION_PARAMETERS) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-left">
            <h2 className="text-sm font-bold tracking-wide uppercase text-slate-400 flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-emerald-400" />
              {"C# TokenValidationParameters"}
            </h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              {"These properties directly define how ASP.NET Core Middleware accepts or rejects incoming JWT signatures."}
            </p>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer py-1.5 px-2 rounded-xl hover:bg-slate-850/50 transition">
                <input 
                  type="checkbox"
                  checked={validateIssuer}
                  onChange={(e) => setValidateIssuer(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500 w-4 h-4 mt-0.5"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">{"ValidateIssuer"}</span>
                  <span className="text-[10px] text-slate-400 block">{"Rejects tokens with mismatched issuer configurations."}</span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer py-1.5 px-2 rounded-xl hover:bg-slate-850/50 transition">
                <input 
                  type="checkbox"
                  checked={validateAudience}
                  onChange={(e) => setValidateAudience(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500 w-4 h-4 mt-0.5"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">{"ValidateAudience"}</span>
                  <span className="text-[10px] text-slate-400 block">{"Checks targeting to avoid spoofing in multi-app configurations."}</span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer py-1.5 px-2 rounded-xl hover:bg-slate-850/50 transition">
                <input 
                  type="checkbox"
                  checked={validateLifetime}
                  onChange={(e) => setValidateLifetime(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500 w-4 h-4 mt-0.5"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">{"ValidateLifetime"}</span>
                  <span className="text-[10px] text-slate-400 block">{"Checks that the current clock timestamp falls within token bounds."}</span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer py-1.5 px-2 rounded-xl hover:bg-slate-850/50 transition">
                <input 
                  type="checkbox"
                  checked={validateIssuerSigningKey}
                  onChange={(e) => setValidateIssuerSigningKey(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500 w-4 h-4 mt-0.5"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">{"ValidateIssuerSigningKey"}</span>
                  <span className="text-[10px] text-slate-400 block">{"Forces verification of signature hashes against our secret."}</span>
                </div>
              </label>
            </div>
          </div>

          {/* DETAILED USER CLAIM BUILDER TABLE */}
          <div id="mock-database-card" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-left">
            <div className="flex border-b border-slate-800 mb-4 pb-2 justify-between items-center">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setSidebarTab('claims')}
                  className={`text-xs font-bold uppercase tracking-wide pb-1.5 border-b-2 cursor-pointer transition ${
                    sidebarTab === 'claims' 
                      ? 'border-indigo-500 text-indigo-400' 
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {"Claims Registry"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSidebarTab('register');
                    setSelectedEndpoint('/api/auth/register');
                  }}
                  className={`text-xs font-bold uppercase tracking-wide pb-1.5 border-b-2 cursor-pointer transition ${
                    sidebarTab === 'register' 
                      ? 'border-indigo-500 text-indigo-400 font-extrabold' 
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {"C# Registration Simulator"}
                </button>
              </div>
            </div>
            
            {sidebarTab === 'claims' ? (
              <>
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                  {"Select or construct customized authentication identity catalogs. These claims will be integrated into the simulated C# token."}
                </p>

                <div className="space-y-2 max-h-[180px] overflow-y-auto mb-4 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setManualToken(""); // Reset manual edits when selecting user
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left border transition cursor-pointer ${
                        selectedUserId === user.id 
                          ? 'bg-purple-950/40 border-purple-800/80 text-white font-medium shadow-sm' 
                          : 'bg-slate-955/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900/50'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold flex items-center gap-1.5">
                          {user.name}
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                            user.role === 'Admin' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            user.role === 'Manager' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono italic">{"username: "}{user.username}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        {user.customClaims.length} {"claims"} <ArrowRight className="w-3 h-3 text-slate-500" />
                      </div>
                    </button>
                  ))}
                </div>

                {/* EXPANDABLE COLLAPSED CREATE NEW USER FORM */}
                <form onSubmit={handleAddCustomUser} className="border-t border-slate-800 pt-3.5 space-y-3">
                  <span className="text-xs font-bold text-slate-300 block">{"Add Custom Identity Claims"}</span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{"Full Name"}</label>
                      <input 
                        type="text"
                        required
                        placeholder="E.g. Diana Prince"
                        value={customUserForm.name}
                        onChange={(e) => setCustomUserForm({...customUserForm, name: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                      />
                    </div>
                    
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{"Username"}</label>
                      <input 
                        type="text"
                        required
                        placeholder="E.g. diana"
                        value={customUserForm.username}
                        onChange={(e) => setCustomUserForm({...customUserForm, username: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{"Role"}</label>
                      <select
                        value={customUserForm.role}
                        onChange={(e) => setCustomUserForm({...customUserForm, role: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                      >
                        <option value="User">{"User"}</option>
                        <option value="Manager">{"Manager"}</option>
                        <option value="Admin">{"Admin"}</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{"Age Claim"}</label>
                      <input 
                        type="number"
                        min={1}
                        max={120}
                        value={customUserForm.age}
                        onChange={(e) => setCustomUserForm({...customUserForm, age: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">{"Dept"}</label>
                      <input 
                        type="text"
                        value={customUserForm.department}
                        onChange={(e) => setCustomUserForm({...customUserForm, department: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-950"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> {"Register Identity and Switch"}
                  </button>
                </form>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  {"Interactively trigger ASP.NET RegisterController user registration with authentic password hashing, validation warnings, and DB insertion."}
                </p>
                
                <form onSubmit={handleRegisterUser} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">{"Full Name *"}</label>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                        placeholder="E.g. Diana Prince"
                      />
                      {regFormErrors["Name"] && (
                        <p className="text-[9px] text-rose-400 mt-0.5">{regFormErrors["Name"][0]}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">{"Username *"}</label>
                      <input
                        type="text"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                        placeholder="diana.security"
                      />
                      {regFormErrors["Username"] && (
                        <p className="text-[9px] text-rose-400 mt-0.5">{regFormErrors["Username"][0]}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">{"Email Address *"}</label>
                    <input
                      type="text"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                      placeholder="diana@contoso.com"
                    />
                    {regFormErrors["Email"] && (
                      <p className="text-[9px] text-rose-400 mt-0.5">{regFormErrors["Email"][0]}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">{"Password *"}</label>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                        placeholder="••••••••"
                      />
                      {regFormErrors["Password"] && (
                        <p className="text-[9px] text-rose-400 mt-0.5">{regFormErrors["Password"][0]}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">{"Confirm *"}</label>
                      <input
                        type="password"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                        placeholder="••••••••"
                      />
                      {regFormErrors["ConfirmPassword"] && (
                        <p className="text-[9px] text-rose-400 mt-0.5">{regFormErrors["ConfirmPassword"][0]}</p>
                      )}
                    </div>
                  </div>

                  {/* Cryptographic Password Complexity Real-time Verification Panel */}
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-400 block tracking-wide uppercase">C# PBKDF2 Password Constraints</span>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${regPassword.length >= 6 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                        <span className={regPassword.length >= 6 ? 'text-emerald-400' : 'text-slate-400'}>Min 6 Length</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(regPassword) ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                        <span className={/[A-Z]/.test(regPassword) ? 'text-emerald-400' : 'text-slate-400'}>Uppercase Letter</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(regPassword) ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                        <span className={/[a-z]/.test(regPassword) ? 'text-emerald-400' : 'text-slate-400'}>Lowercase Letter</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(regPassword) ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                        <span className={/[0-9]/.test(regPassword) ? 'text-emerald-400' : 'text-slate-400'}>Decimal Digit</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${/[^A-Za-z0-9]/.test(regPassword) ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                        <span className={/[^A-Za-z0-9]/.test(regPassword) ? 'text-emerald-400' : 'text-slate-400'}>Special Character (e.g. !@#$)</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">{"Age Claim *"}</label>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={regAge}
                        onChange={(e) => setRegAge(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                      />
                      {regFormErrors["Age"] && (
                        <p className="text-[9px] text-rose-400 mt-0.5">{regFormErrors["Age"][0]}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">{"Role"}</label>
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                      >
                        <option value="User">{"User"}</option>
                        <option value="Manager">{"Manager"}</option>
                        <option value="Admin">{"Admin"}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">{"Department"}</label>
                      <input
                        type="text"
                        value={regDept}
                        onChange={(e) => setRegDept(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 active:from-emerald-700 active:to-indigo-700 transition rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-md mt-2"
                  >
                    <Send className="w-4 h-4" /> {"POST /api/auth/register"}
                  </button>
                </form>

                {/* Micro Response Feedback Block inside form */}
                {regResponseData && (
                  <div className={`mt-3 p-3 rounded-xl border ${
                    regResponseData.status === 201 
                      ? 'bg-emerald-950/20 border-emerald-800/60 text-slate-200' 
                      : 'bg-rose-950/20 border-rose-800/60 text-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5 border-b pb-1.5 border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Simulated Server Response</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                        regResponseData.status === 201 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {regResponseData.status} {regResponseData.status === 201 ? "Created" : "Bad Request"}
                      </span>
                    </div>

                    {regResponseData.status === 201 ? (
                      <div className="space-y-2">
                        <p className="text-[11px] text-slate-300">
                          {"User registered successfully! Secure hash generated using ASP.NET Identity subkeys."}
                        </p>
                        <div className="bg-slate-950 p-2 rounded-lg space-y-1">
                          <div className="text-[9px] font-mono text-slate-400">
                            <strong>{"Salt: "}</strong>{" "}{regResponseData.salt.substring(0, 20)}...
                          </div>
                          <div className="text-[9px] font-mono text-slate-400 break-all">
                            <strong>{"Stored Hash: "}</strong>{" "}{regResponseData.hash.substring(0, 30)}...
                          </div>
                        </div>

                        {lastRegisteredUser && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserId(lastRegisteredUser.id);
                              setSidebarTab('claims');
                              setSelectedEndpoint('/api/profile');
                              setActiveWorkspaceTab('sandbox');
                              setManualToken("");
                            }}
                            className="w-full py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white rounded-lg flex items-center justify-center gap-1 cursor-pointer transition shadow-sm"
                          >
                            <Key className="w-3 h-3" /> {"Generate JWT & Authenticate as "}{lastRegisteredUser.name}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1 text-[10px]">
                        <p className="text-rose-400 font-semibold">{regResponseData.title}</p>
                        <ul className="list-disc pl-4 space-y-1 text-slate-400">
                          {Object.entries(regResponseData.errors).map(([key, val]: [string, any]) => (
                            <li key={key}>
                              <strong>{key}:</strong> {val[0]}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: INTERACTIVE TABS VIEW */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-[500px]">

          {/* MAIN TAB SWITCH VIEW 1: CODE ENGINE */}
          {activeWorkspaceTab === 'editor' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col flex-1 overflow-hidden shadow-2xl">
              
              {/* CODE FILE NAV TABS */}
              <div className="bg-slate-950 px-4 pt-3 flex border-b border-slate-800 overflow-x-auto gap-1 scrollbar-none font-mono">
                <button
                  onClick={() => setActiveCodeFile('program')}
                  className={`px-4 py-2 text-xs font-medium rounded-t-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeCodeFile === 'program' 
                      ? 'bg-slate-900 text-purple-400 border-t border-x border-slate-800' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className="text-xs text-purple-500 font-bold">{"C#"}</span> {"Program.cs"}
                </button>
                <button
                  onClick={() => setActiveCodeFile('service')}
                  className={`px-4 py-2 text-xs font-medium rounded-t-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeCodeFile === 'service' 
                      ? 'bg-slate-900 text-purple-400 border-t border-x border-slate-800' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className="text-xs text-purple-500 font-bold">{"C#"}</span> {"TokenService.cs"}
                </button>
                <button
                  onClick={() => setActiveCodeFile('auth_controller')}
                  className={`px-4 py-2 text-xs font-medium rounded-t-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeCodeFile === 'auth_controller' 
                      ? 'bg-slate-900 text-purple-400 border-t border-x border-slate-800' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className="text-xs text-purple-500 font-bold">{"C#"}</span> {"AuthController.cs"}
                </button>
                <button
                  onClick={() => setActiveCodeFile('register_controller')}
                  className={`px-4 py-2 text-xs font-medium rounded-t-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeCodeFile === 'register_controller' 
                      ? 'bg-slate-900 text-purple-400 border-t border-x border-slate-800' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className="text-xs text-purple-500 font-bold">{"C#"}</span> {"RegisterController.cs"}
                </button>
                <button
                  onClick={() => setActiveCodeFile('register_dto')}
                  className={`px-4 py-2 text-xs font-medium rounded-t-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeCodeFile === 'register_dto' 
                      ? 'bg-slate-900 text-purple-400 border-t border-x border-slate-800' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className="text-xs text-purple-500 font-bold">{"C#"}</span> {"RegisterRequest.cs (DTO)"}
                </button>
                <button
                  onClick={() => setActiveCodeFile('password_hasher')}
                  className={`px-4 py-2 text-xs font-medium rounded-t-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeCodeFile === 'password_hasher' 
                      ? 'bg-slate-900 text-purple-400 border-t border-x border-slate-800' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className="text-xs text-purple-500 font-bold">{"C#"}</span> {"PasswordHasher.cs"}
                </button>
                <button
                  onClick={() => setActiveCodeFile('db_context')}
                  className={`px-4 py-2 text-xs font-medium rounded-t-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeCodeFile === 'db_context' 
                      ? 'bg-slate-900 text-purple-400 border-t border-x border-slate-800' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className="text-xs text-purple-500 font-bold">{"C#"}</span> {"AppDbContext.cs"}
                </button>
                <button
                  onClick={() => setActiveCodeFile('policy_controller')}
                  className={`px-4 py-2 text-xs font-medium rounded-t-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeCodeFile === 'policy_controller' 
                      ? 'bg-slate-900 text-purple-400 border-t border-x border-slate-800' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className="text-xs text-purple-500 font-bold">{"C#"}</span> {"SecuredDataController.cs"}
                </button>
                <button
                  onClick={() => setActiveCodeFile('appsettings')}
                  className={`px-4 py-2 text-xs font-medium rounded-t-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeCodeFile === 'appsettings' 
                      ? 'bg-slate-900 text-purple-400 border-t border-x border-slate-800' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className="text-orange-500 font-bold text-[10px]">{"{}"}</span> {"appsettings.json"}
                </button>
              </div>

              {/* ACTIVE CODE CANVAS PANEL */}
              <div className="p-4 bg-slate-900 flex-1 flex flex-col text-left">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-slate-400">
                      {activeCodeFile === 'program' ? '🚀 ASP.NET Entry Point & Middleware Chain' :
                       activeCodeFile === 'service' ? '🛡️ Microsoft Security Token Descriptor Creator' :
                       activeCodeFile === 'auth_controller' ? '🔑 User Authenticator & Login API Flow' :
                       activeCodeFile === 'register_controller' ? '📝 User Registration API endpoint controller (stores secure records in DbContext)' :
                       activeCodeFile === 'register_dto' ? '📦 Input DTO with C# attribute-based DataAnnotations validators' :
                       activeCodeFile === 'password_hasher' ? '🔐 RFC 2898 (PBKDF2) Cryptographic hashing & verification service' :
                       activeCodeFile === 'db_context' ? '🗄️ EF Core DbContext & SQL Database user schemas config' :
                       activeCodeFile === 'policy_controller' ? '🥩 Role & custom claim authorization controller endpoints' :
                       '⚙️ Application configuration options file'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      const codeStr = activeCodeFile === 'program' ? generatedProgramCs :
                                     activeCodeFile === 'service' ? generatedTokenService :
                                     activeCodeFile === 'auth_controller' ? generatedAuthController :
                                     activeCodeFile === 'register_controller' ? generatedRegisterController :
                                     activeCodeFile === 'register_dto' ? generatedRegisterDto :
                                     activeCodeFile === 'password_hasher' ? generatedPasswordHasher :
                                     activeCodeFile === 'db_context' ? generatedDbContext :
                                     activeCodeFile === 'policy_controller' ? generatedPolicyController :
                                     generatedAppSettings;
                      handleCopyCode(codeStr, activeCodeFile);
                    }}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                  >
                    {isCopied[activeCodeFile] ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">{"Copied!"}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{"Copy Code"}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* VISUAL CODE AREA WITH MOCK SYNTAX STYLING */}
                <div className="bg-slate-950 rounded-xl relative border border-slate-800 p-4 font-mono text-xs overflow-auto flex-1 max-h-[580px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  <pre className="text-slate-300 leading-relaxed text-left select-all whitespace-pre">
                    {activeCodeFile === 'program' && generatedProgramCs}
                    {activeCodeFile === 'service' && generatedTokenService}
                    {activeCodeFile === 'auth_controller' && generatedAuthController}
                    {activeCodeFile === 'register_controller' && generatedRegisterController}
                    {activeCodeFile === 'register_dto' && generatedRegisterDto}
                    {activeCodeFile === 'password_hasher' && generatedPasswordHasher}
                    {activeCodeFile === 'db_context' && generatedDbContext}
                    {activeCodeFile === 'policy_controller' && generatedPolicyController}
                    {activeCodeFile === 'appsettings' && generatedAppSettings}
                  </pre>
                </div>

                {/* HELPFUL CONTEXT INFO BARS */}
                <div className="mt-4 bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-400 flex items-start gap-2.5 font-sans">
                  <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    {activeCodeFile === 'program' && (
                      <p>
                        <strong>{"Order of Middlewares (Mandatory):"}</strong> {"Always call app.UseAuthentication() before app.UseAuthorization(). Swapping these statements will bypass safety checks, routing requests as unauthenticated."}
                      </p>
                    )}
                    {activeCodeFile === 'service' && (
                      <p>
                        <strong>{"Framework mapping behavior:"}</strong> {"ASP.NET Core uses the modern JwtSecurityTokenHandler module to wrap claims. By default, standard short keys like 'sub' are automatically mapped into verbose XML Schema strings."}
                      </p>
                    )}
                    {activeCodeFile === 'auth_controller' && (
                      <p>
                        <strong>{"Authentication Scheme challenges:"}</strong> {"The auth handler returns HTTP 401 challenges containing Bearer descriptions natively if credentials do not validate."}
                      </p>
                    )}
                    {activeCodeFile === 'register_controller' && (
                      <p>
                        <strong>{"Registration flow logic:"}</strong> {"Performs validations via ModelState.IsValid, queries unique email/username constraints via EF Core DbSet, hashes the password via IPasswordHasher, and saves the new User record asynchronously."}
                      </p>
                    )}
                    {activeCodeFile === 'register_dto' && (
                      <p>
                        <strong>{"DataAnnotations Constraints:"}</strong> {"C# attributes like [Required], [EmailAddress], and [RegularExpression] are parsed by the ASP.NET Core MVC binder. Overwhelmingly, complexity rules are executed using high-performance regex checks on the payload."}
                      </p>
                    )}
                    {activeCodeFile === 'password_hasher' && (
                      <p>
                        <strong>{"Salt Cryptography Factor:"}</strong> {"Always use high-entropy random byte arrays (via RandomNumberGenerator) rather than deterministic salts, protecting you against pre-computed string lookup (Rainbow table) attacks."}
                      </p>
                    )}
                    {activeCodeFile === 'db_context' && (
                      <p>
                        <strong>{"DbContext Indexing optimization:"}</strong> {"We use modelBuilder.Entity<User>(...).HasIndex(e => e.Username).IsUnique() to build index chains, which prevents race conditions with concurrent registrations."}
                      </p>
                    )}
                    {activeCodeFile === 'policy_controller' && (
                      <p>
                        <strong>{"Gated Security logic:"}</strong> {"Use attributes such as [Authorize(Roles = \"Admin,Manager\")] to require role arrays or declare sophisticated policy claims evaluated statically at startup."}
                      </p>
                    )}
                    {activeCodeFile === 'appsettings' && (
                      <p>
                        {"Ensure configurations match inside appsettings.json. In production environments, store SecretKey using Cloud Secrets Manager or Environment variables!"}
                      </p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* MAIN TAB SWITCH VIEW 2: INTERACTIVE SANDBOX & TRACE */}
          {activeWorkspaceTab === 'sandbox' && (
            <div className="space-y-6 flex flex-col flex-1">
              
              {/* CURRENT TOKEN STATUS FORGE AND DECODER */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-left">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                      <Sparkles className="w-4.5 h-4.5 text-purple-400" />
                      {"Token Generator Forge & Client Decoder"}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {"Live encoded output corresponding to the active mock user settings."}
                    </p>
                  </div>
                  
                  {/* Token manipulation options */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsTokenExpired(!isTokenExpired)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                        isTokenExpired 
                          ? 'bg-rose-500 text-white shadow' 
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {isTokenExpired ? '🕒 Simulating Expired' : '🕒 Make Expired'}
                    </button>

                    <button
                      onClick={() => setIsTokenTampered(!isTokenTampered)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                        isTokenTampered 
                          ? 'bg-amber-600 text-white shadow' 
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {isTokenTampered ? '💥 Token Tampered!' : '💥 Tamper Signature'}
                    </button>
                  </div>
                </div>

                {/* BASE64 DECODED TOKEN SEGMENTS */}
                <div className="space-y-3 text-left">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">{"Generated JWT Token String (Header.Payload.Signature)"}</label>
                    <div className="relative">
                      <textarea
                        value={currentInteractiveToken}
                        onChange={(e) => handleManualTokenEdit(e.target.value)}
                        rows={3}
                        className={`w-full bg-slate-950 rounded-xl p-3 text-xs font-mono border leading-relaxed focus:outline-none focus:ring-1 focus:ring-purple-500 transition resize-none ${
                          isTokenTampered ? 'border-amber-600 focus:ring-amber-500 text-slate-300' : 'border-slate-800 text-slate-300'
                        }`}
                      />
                      <button
                        onClick={() => handleCopyCode(currentInteractiveToken, 'token')}
                        className="absolute right-3.5 bottom-3.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg text-xs transition cursor-pointer"
                        title="Copy token string"
                      >
                        {isCopied['token'] ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* HIGH CONTRAST VISUAL SEGMENTS FOR DECODED TOKEN */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    
                    {/* Header Details */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-left">
                      <span className="text-[10px] uppercase font-bold text-rose-400 block mb-1.5 tracking-wider">{"Segment 1: Header (Algorithm & Metadata)"}</span>
                      <pre className="text-xs font-mono text-rose-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {decodedHeader ? JSON.stringify(decodedHeader, null, 2) : "Malformed"}
                      </pre>
                    </div>

                    {/* Payload Claims Details */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-left">
                      <span className="text-[10px] uppercase font-bold text-indigo-400 block mb-1.5 tracking-wider">{"Segment 2: Payload Assertions (Claims Set)"}</span>
                      <pre className="text-xs font-mono text-indigo-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {decodedPayload ? JSON.stringify(decodedPayload, null, 2) : "Malformed"}
                      </pre>
                    </div>

                  </div>

                  {/* CRYPTO SIGNATURE STATUS */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-850 gap-2 text-left">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-full ${tokenSignatureValid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {tokenSignatureValid ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold block text-slate-200">
                          {"Cryptographic Signature Verified"}
                        </span>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          {tokenSignatureValid 
                            ? 'Matches HMAC-SHA256 signature calculated from current Secret Key.' 
                            : 'This server will reject the token immediately! Signature segment is mismatch.'}
                        </p>
                      </div>
                    </div>
                    {tokenSignatureValid ? (
                      <span className="text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                        {"Secure Integrity"}
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">
                        {"Invalid Hash"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ENDPOINT VERIFICATION SIMULATION DASHBOARD */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-left">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                      <Terminal className="w-4.5 h-4.5 text-emerald-400" />
                      {"ASP.NET Pipeline Middleware Sandbox Evaluator"}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {"Send mock HTTP GET operations with your token payload to see middleware lifecycle logs."}
                    </p>
                  </div>

                  {/* Target Controller routes */}
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-xl shrink-0 self-start">
                    <select
                      value={selectedEndpoint}
                      onChange={(e) => setSelectedEndpoint(e.target.value)}
                      className="bg-transparent text-slate-300 text-xs px-2 py-1.5 focus:outline-none font-semibold cursor-pointer"
                    >
                      <option value="/api/auth/register">{"POST /api/auth/register [AllowAnonymous]"}</option>
                      <option value="/api/public">{"GET /api/public [AllowAnonymous]"}</option>
                      <option value="/api/profile">{"GET /api/profile [Authorize]"}</option>
                      <option value="/api/admin">{"GET /api/admin [Authorize(Roles=\"Admin\")]"}</option>
                      <option value="/api/executive">{"GET /api/executive [Authorize(Roles=\"Admin,Manager\")]"}</option>
                      <option value="/api/vip-age">{"GET /api/vip-age [Authorize(Policy=\"Over21Only\")]"}</option>
                    </select>
                  </div>
                </div>

                {/* HTTP RESPONSE & SERVER LOG WORKSPACE MAP */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                  
                  {/* Left segment - Response metadata */}
                  <div className="xl:col-span-5 bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-col justify-between text-left">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-2 font-mono">{"HTTP Response Package"}</span>
                      
                      {/* Interactive server HTTP status code badge */}
                      <div className="flex items-center gap-3.5 mb-3.5">
                        <div className={`text-2xl font-black font-mono px-3.5 py-1 rounded-xl border ${
                          simulatedStatus === 200 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
                          simulatedStatus === 401 ? 'bg-rose-500/15 text-rose-400 border-rose-500/20 shadow-md shadow-rose-950/20' :
                          'bg-amber-500/15 text-amber-400 border-amber-500/20'
                        }`}>
                          {simulatedStatus}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-200 block">{simulatedStatusText}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{"Date: "}{new Date().toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">{"Pipeline Evaluation Details:"}</span>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {simulatedExplanation}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500 space-y-1">
                      <div className="flex justify-between">
                        <span>{"Server Framework:"}</span>
                        <span className="font-mono text-slate-400">{"ASP.NET Core Kestrel"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{"Content-Type:"}</span>
                        <span className="font-mono text-slate-400">{"application/json; charset=utf-8"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right segment - Middleware execution logs console */}
                  <div className="xl:col-span-7 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                    <div className="bg-slate-900 px-3 py-2 border-b border-slate-850 flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {"Kestrel Runtime Terminal Trace"}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{"ConsoleLogs"}</span>
                    </div>

                    <div className="p-3 font-mono text-[11px] leading-relaxed select-all text-left max-h-[220px] overflow-y-auto space-y-2 flex-1 scrollbar-thin scrollbar-thumb-slate-800">
                      {middlewareTrace.map((log, index) => {
                        let colorClass = "text-slate-400";
                        if (log.type === "error") colorClass = "text-rose-400 font-semibold";
                        if (log.type === "warn") colorClass = "text-amber-400 font-medium";
                        if (log.type === "success") colorClass = "text-emerald-400";
                        if (log.type === "debug") colorClass = "text-indigo-400";

                        return (
                          <div key={index} className="border-b border-slate-900/40 pb-1 flex items-start gap-1">
                            <span className="text-slate-600 shrink-0 select-none">{"["}{log.timestamp}{"]"}</span>
                            <span className={colorClass}>{log.message}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* MAIN TAB SWITCH VIEW 3: C# JWT FAQs & COMPREHENSIVE ISSUES MANUAL */}
          {activeWorkspaceTab === 'docs' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 overflow-auto max-h-[750px] scrollbar-thin scrollbar-thumb-slate-800">
              
              <div className="border-b border-slate-800 pb-4 text-left font-sans">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Bug className="w-5 h-5 text-indigo-400" />
                  {"ASP.NET Core JWT Common Exceptions & Troubleshooting Guide"}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {"Essential quick-fixes for runtime crashes and token authorization mismatches in .NET."}
                </p>
              </div>

              <div className="space-y-6 text-left">
                
                {/* Exception 1 */}
                <div className="bg-slate-950 border border-slate-800 p-4.5 rounded-xl space-y-2.5">
                  <div className="flex items-start gap-2">
                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs px-2 py-0.5 rounded font-mono font-bold">{"EXCEPTION_OUT_OF_RANGE"}</span>
                    <h4 className="text-xs font-bold text-slate-200">
                      {"ArgumentOutOfRangeException: 'IDX10603: Decryption failed. IssuerSigningKey size is too small'"}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    <strong>{"Root Cause:"}</strong> {"For security compliance, HMAC-SHA256 signature mapping requires symmetric keys to be at least 256 bits (32 bytes / 32 characters) long."}
                  </p>
                  <div className="text-[11px] bg-slate-900 p-2.5 rounded-lg text-slate-300 font-mono">
                    <span className="text-emerald-400">{"// FIX: Use a cryptographically strong fallback key in appsettings.json"}</span><br />
                    <span>{"\"SecretKey\": \"SuperSecretKeyExampleThatIsOver32CharsLongAndSecure!\""}</span>
                  </div>
                </div>

                {/* Exception 2 */}
                <div className="bg-slate-950 border border-slate-800 p-4.5 rounded-xl space-y-2.5">
                  <div className="flex items-start gap-2">
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-2 py-0.5 rounded font-mono font-bold">{"IDENTITY_MAPPING_FAIL"}</span>
                    <h4 className="text-xs font-bold text-slate-200">
                      {"Role constraints failing: User.IsInRole(\"Admin\") returning false when JWT payload contains Role claims"}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    <strong>{"Root Cause:"}</strong> {"Legacy WS-Trust/SOAP mappings replace standard claim strings dynamically. A standard claim of 'role' gets remapped in the ClaimsPrincipal context to http://schemas.microsoft.com/ws/2008/06/identity/claims/role. If your controller references raw names, checks evaluate incorrectly."}
                  </p>
                  <div className="text-[11px] bg-slate-900 p-2.5 rounded-lg text-slate-300 font-mono space-y-1">
                    <span className="text-emerald-400">{"// FIX Option A: Disable fallback mapping inside Program.cs (RECOMMENDED)"}</span>
                    <div>{"JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();"}</div>
                    <span className="text-emerald-400">{"// FIX Option B: Map custom role strings explicitly inside options initialization"}</span>
                    <div>{"options.TokenValidationParameters = new TokenValidationParameters { RoleClaimType = \"role\" };"}</div>
                  </div>
                </div>

                {/* Exception 3 */}
                <div className="bg-slate-950 border border-slate-800 p-4.5 rounded-xl space-y-2.5">
                  <div className="flex items-start gap-2">
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-2 py-0.5 rounded font-mono font-bold">{"401_CHALLENGE_FAILED"}</span>
                    <h4 className="text-xs font-bold text-slate-200">
                      {"All endpoints return 401 Unauthorized, even with valid token structures"}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    <strong>{"Root Cause:"}</strong> {"Usually caused by an incorrect compilation order or pipeline order inside your Program.cs middleware stack. ASP.NET handles these sequentially."}
                  </p>
                  <div className="text-[11px] bg-slate-900 p-2.5 rounded-lg text-slate-300 font-mono space-y-1">
                    <span className="text-emerald-400">{"// WRONG PIPELINE INTERNET SEQUENCE"}</span>
                    <div className="line-through text-slate-500">{"app.UseAuthorization();"}</div>
                    <div className="line-through text-slate-500">{"app.UseAuthentication();"}</div>
                    
                    <span className="text-emerald-400 font-semibold pt-1.5 block">{"// CORRECT MIDDLEWARE SEQUENCE"}</span>
                    <div>{"app.UseAuthentication(); // Must run first to build claims principal"}</div>
                    <div>{"app.UseAuthorization();  // Evaluates claims parameters"}</div>
                  </div>
                </div>

                {/* Exception 4 */}
                <div className="bg-slate-950 border border-slate-800 p-4.5 rounded-xl space-y-2.5">
                  <div className="flex items-start gap-2">
                    <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs px-2 py-0.5 rounded font-mono font-bold">{"BEST_PRACTICE"}</span>
                    <h4 className="text-xs font-bold text-slate-200">
                      {"Eliminating ClockSkew Issues on Transient Tokens"}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    <strong>{"Root Cause:"}</strong> {"By default, .NET Bearer Authentication adds a passive 5-minute clock tolerance (ClockSkew) to token checks. This means an expired token can still work for up to 300 seconds after its nominal death."}
                  </p>
                  <div className="text-[11px] bg-slate-900 p-2.5 rounded-lg text-slate-300 font-mono">
                    <span className="text-emerald-400">{"// Set clock tolerance to absolute zero inside TokenValidationParameters:"}</span><br />
                    <span>{"options.TokenValidationParameters = new TokenValidationParameters { ClockSkew = TimeSpan.Zero };"}</span>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

      </main>

      {/* FOOTER METRICS AND CONTEXT */}
      <footer id="editor-footer" className="mt-auto border-t border-slate-950 bg-slate-950 px-6 py-4 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-2">
        <p>{"Built with Next.js, tailwind directives & standard asymmetric C# crypto standards."}</p>
        <p className="font-mono">{"Local UTC validation environment: 2026-06-16 23:07"}</p>
      </footer>

    </div>
  );
}
