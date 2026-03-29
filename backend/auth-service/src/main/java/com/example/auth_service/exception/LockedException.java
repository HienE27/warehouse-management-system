package com.example.auth_service.exception;

public class LockedException extends RuntimeException {
    private final long retrySeconds;

    public LockedException(String message, long retrySeconds) {
        super(message);
        this.retrySeconds = retrySeconds;
    }

    public long getRetrySeconds() {
        return retrySeconds;
    }
}


