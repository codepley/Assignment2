/**
 * IIFE (Immediately Invoked Function Expression) to encapsulate the tracking logic
 * and avoid polluting the global namespace.
 */
(function() {

    /**
     * Identifies the type of an HTML element for the event log.
     * @param {HTMLElement} target - The HTML element that was the target of an event.
     * @returns {string} A user-friendly description of the element.
     */
    function getObjectDescription(target) {
        // If the target is null or undefined (for a page view), describe the page.
        if (!target) {
            return `Page View on "${document.title}"`;
        }

        // Get the lowercase tag name of the element.
        const tagName = target.tagName.toLowerCase();

        // Use a switch statement to provide descriptions based on the tag name.
        switch (tagName) {
            case 'img':
                return 'image';
            case 'a':
                return 'link';
            case 'button':
                return 'button';
            case 'select':
                return 'drop_down';
            case 'textarea':
                return 'text_area';
            case 'input':
                // For input elements, be more specific based on their type.
                const inputType = target.type ? target.type.toLowerCase() : 'text';
                return `${inputType}_input`; // e.g., "text_input", "file_input", "submit_input"
            case 'p':
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
            case 'span':
            case 'li':
            case 'td':
                return 'text';
            default:
                // For any other element, return its tag name.
                return `${tagName}_element`;
        }
    }

    /**
     * Constructs the event data object and prints it to the console.
     * @param {string} eventType - The type of event ('view' or 'click').
     * @param {HTMLElement} eventTarget - The target element of the event.
     */
    function logEvent(eventType, eventTarget) {
        // Create the event data object in the required format.
        const eventData = {
            timestamp_of_event: new Date().toISOString(), // Use ISO 8601 format for a standard timestamp.
            type_of_event: eventType,
            event_object: getObjectDescription(eventTarget)
        };

        // Print the captured event object to the developer console.
        console.log("User Event Captured:", eventData);
    }

    /**
     * --- Attaching Event Listeners ---
     */

    // 1. CAPTURE PAGE VIEW EVENT
    // Use the 'DOMContentLoaded' event to ensure the page title is available.
    // This event fires when the initial HTML document has been completely loaded and parsed.
    document.addEventListener('DOMContentLoaded', () => {
        // Log the 'view' event. The target is null as it pertains to the whole page.
        logEvent('view', null);
    });

    // 2. CAPTURE ALL CLICK EVENTS
    // Attach a single click listener to the entire document in the "capture" phase.
    // This ensures it catches all clicks before they might be stopped by other scripts.
    document.addEventListener('click', (event) => {
        // Log the 'click' event, passing the specific element that was clicked.
        logEvent('click', event.target);
    }, true);

})(); // End of IIFE
