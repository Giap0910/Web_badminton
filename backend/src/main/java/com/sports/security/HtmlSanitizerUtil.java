package com.sports.security;

import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;

public class HtmlSanitizerUtil {

    /**
     * Cleans user input to prevent Stored XSS attacks.
     * Strips all executable script tags, event handlers, and dangerous attributes.
     */
    public static String sanitize(String rawHtml) {
        if (rawHtml == null) {
            return null;
        }
        // Allows simple safe formatting (b, em, i, p) but strips all scripts, onclick, javascript: links
        return Jsoup.clean(rawHtml.trim(), Safelist.basic());
    }

    /**
     * Strictly removes ALL HTML tags, returning plain text only.
     */
    public static String sanitizeToPlainText(String rawHtml) {
        if (rawHtml == null) {
            return null;
        }
        return Jsoup.clean(rawHtml.trim(), Safelist.none());
    }
}
