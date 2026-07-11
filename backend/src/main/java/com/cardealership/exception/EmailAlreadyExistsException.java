package com.cardealership.exception;

/**
 * Exception thrown when a user attempts to register with an email that is already in use.
 */
public class EmailAlreadyExistsException extends RuntimeException {
    public EmailAlreadyExistsException(String message) {
        super(message);
    }
}
