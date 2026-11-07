package main

import (
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// securityHeaders adds basic browser protections to every response.
func securityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.Writer.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Next()
	}
}

// rateLimit allows max requests per IP per window (in memory, fine for one server).
func rateLimit(max int, window time.Duration) gin.HandlerFunc {
	var mu sync.Mutex
	hits := map[string][]time.Time{}
	return func(c *gin.Context) {
		mu.Lock()
		now, ip := time.Now(), c.ClientIP()
		recent := hits[ip][:0]
		for _, t := range hits[ip] {
			if now.Sub(t) < window {
				recent = append(recent, t)
			}
		}
		if len(recent) >= max {
			hits[ip] = recent
			mu.Unlock()
			fail(c, 429, "Too many attempts. Please wait a minute and try again.")
			return
		}
		hits[ip] = append(recent, now)
		mu.Unlock()
		c.Next()
	}
}
