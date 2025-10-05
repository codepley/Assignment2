// --- Live Clock Functionality ---
function startTime() {
    const today = new Date();
    document.getElementById('clock').innerHTML = today.toLocaleString();
    setTimeout(startTime, 1000); // Update every second
}

// Start the clock when the window loads
window.addEventListener('load', startTime);


// --- Accordion for Course Policy Section ---
document.addEventListener('DOMContentLoaded', function() {
    const policyTitles = document.querySelectorAll('.policy-title');

    policyTitles.forEach(title => {
        // Hide content by default
        const content = title.nextElementSibling;
        content.style.maxHeight = 0;

        title.addEventListener('click', () => {
            const content = title.nextElementSibling;
            
            // Toggle the 'active' class on the content
            content.classList.toggle('active');

            // Also toggle an 'active' state on the title for styling (e.g., arrow rotation)
            title.classList.toggle('active'); 
            
            // This is the main logic for opening/closing
            if (content.style.maxHeight && content.style.maxHeight !== "0px"){
                content.style.maxHeight = 0;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });
});