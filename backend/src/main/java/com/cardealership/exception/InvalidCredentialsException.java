package com.cardealership.exception;

/**
 * Exception thrown when login credentials are invalid (wrong password or non-existent user).
 * Always uses a generic message to prevent user enumeration attacks.
 */
public class InvalidCredentialsException extends RuntimeException {
    public InvalidCredentialsException() {
        super("Invalid email or password");
    }
}
