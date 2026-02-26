document.addEventListener('DOMContentLoaded', function () {
    const submitButton = document.querySelector('.warranty-registration-submit-button');
    const form = document.querySelector('.warranty-registration-form');
    const inputs = document.querySelectorAll('.warranty-registration-input');

    // Single field validation function
    function validateField(input, checkRequired = true) {
        const value = input.value.trim();
        const fieldContainer = input.closest('.login-input-fields-container');

        // Remove existing error styling
        input.classList.remove('field-error');
        const existingError = fieldContainer.querySelector('.field-error-message');
        if (existingError) {
            existingError.remove();
        }

        // Check if field is empty (only if checkRequired is true)
        if (checkRequired && !value) {
            showFieldError(input, fieldContainer, 'Please fill this detail');
            return false;
        }

        // Skip validation if field is empty and not required check
        if (!value) return true;

        // Email validation
        if (input.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                showFieldError(input, fieldContainer, 'Please enter a valid email address');
                return false;
            }
        }

        // Phone validation
        if (input.type === 'tel') {
            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(value.replace(/\D/g, ''))) {
                showFieldError(input, fieldContainer, 'Please enter a valid 10-digit phone number');
                return false;
            }
        }

        return true;
    }

    // Form validation function - validates one field at a time
    function validateForm() {
        // Clear all existing errors first
        inputs.forEach(input => {
            input.classList.remove('field-error');
            const fieldContainer = input.closest('.login-input-fields-container');
            const existingError = fieldContainer.querySelector('.field-error-message');
            if (existingError) {
                existingError.remove();
            }
        });

        // Check each field one by one and stop at first error
        for (let input of inputs) {
            if (!validateField(input, true)) {
                return false; // Stop at first error
            }
        }

        return true;
    }

    // Show field error function
    function showFieldError(input, fieldContainer, message) {
        input.classList.add('field-error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error-message';
        errorDiv.textContent = message;
        errorDiv.style.color = '#e74c3c';
        errorDiv.style.fontSize = '12px';
        errorDiv.style.marginTop = '4px';
        fieldContainer.appendChild(errorDiv);
    }

    // Get form data function
    function getFormData() {
        const formData = {};
        inputs.forEach(input => {
            const fieldName = input.name || input.id.replace('warranty-registration-', '');
            formData[fieldName] = input.value.trim();
        });
        return formData;
    }

    // CleverTap event function
    function sendWarrantyRegistrationEvent(formData) {
        try {
            const clevertap = window.parent.clevertap;
            if (!clevertap) {
                console.error("CleverTap not found");
                return;
            }

            // Format phone number with country code for CleverTap
            const formattedPhone = formData.phone.startsWith('+') ? formData.phone : `+91${formData.phone}`;

            // Ensure user is identified before firing the event
            const userProfileData = {
                "Name": formData.name,
                "Email": formData.email,
                "Phone": formattedPhone
            };

            // Event data with all form fields
            const eventData = {
                "Name": formData.name,
                "Email Id": formData.email,
                "Phone Number": formattedPhone,
                "Order ID": formData['order-id'],
                "Action": "Warranty Registration"
            };

            // First identify the user, then fire the event
            clevertap.onUserLogin.push({ Site: userProfileData });
            clevertap.event.push("Warranty-Registered-steth", eventData);

            console.log("CleverTap warranty registration data sent successfully:", eventData);
        } catch (error) {
            console.error("CleverTap error:", error);
        }
    }

  async function sendDataToRedshift(formData) {
    const apiUrl = "https://emf9hjl7n5.execute-api.ap-south-1.amazonaws.com"; // Your AWS API endpoint

    const payload = {
        "Name": formData.name,
        "Email ID": formData.email,
        "Phone Number": formData.phone.startsWith('+') ? formData.phone : `+91${formData.phone}`,
        "Order ID": formData['order-id'],
        "Response Time": "1s"
    };

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log("✅ Data successfully sent to Redshift:", text);

        if (response.ok) {
            return { success: true, message: text };
           
        } else {
            return { success: false, message: text || 'Unknown error occurred' };
        }
    } catch (error) {
        console.error("❌ Error sending data to Redshift:", error);
        return { success: false, message: error.message || 'Network error' };
    }
}

    // Simple snackbar notification function
    function showToast() {
        const snackbar = document.getElementById("warranty-snackbar");
        if (snackbar) {
            // Show the snackbar
            snackbar.style.display = 'flex';
            snackbar.classList.remove('hide');

            // Auto-hide snackbar after 5 seconds
            setTimeout(() => {
                snackbar.classList.add('hide');
                setTimeout(() => {
                    snackbar.style.display = 'none';
                    snackbar.classList.remove('hide');
                }, 300);
            }, 5000);
        }
    }
    function showErrorToast() {
        const snackbar = document.getElementById("warranty-error-snackbar");
        if (snackbar) {
            // Show the snackbar
            snackbar.style.display = 'flex';
            snackbar.classList.remove('hide');

            // Auto-hide snackbar after 5 seconds
            setTimeout(() => {
                snackbar.classList.add('hide');
                setTimeout(() => {
                    snackbar.style.display = 'none';
                    snackbar.classList.remove('hide');
                }, 300);
            }, 5000);
        }
    }
    
    // Reset form function
    function resetForm() {
        inputs.forEach(input => {
            input.value = '';
            input.classList.remove('field-error');
            const fieldContainer = input.closest('.login-input-fields-container');
            const existingError = fieldContainer.querySelector('.field-error-message');
            if (existingError) {
                existingError.remove();
            }
        });
    }

// Show loading state on the submit button
function setButtonLoadingState(isLoading) {
    const submitButton = document.querySelector('.warranty-registration-submit-button');
    if (!submitButton) return;

    if (isLoading) {
        submitButton.disabled = true;
        submitButton.classList.add('loading');
        submitButton.innerHTML = `<span class="loader"></span> Submitting...`;
    } else {
        submitButton.disabled = false;
        submitButton.classList.remove('loading');
        submitButton.textContent = 'Submit';
    }
}

// ✅ Handle form submission
async function handleFormSubmission() {
    if (!validateForm()) return;

    const formData = getFormData();

    // Show loader
    setButtonLoadingState(true);

    // Send CleverTap event
    sendWarrantyRegistrationEvent(formData);

    // Send data to Redshift API and wait for result
    const result = await sendDataToRedshift(formData);

    // Hide loader
    setButtonLoadingState(false);

    // Show success or error toast based on response
    if (result.success) {
        showToast();
        resetForm();
        console.log('Warranty registration submitted successfully!', formData);
    } else {
        showErrorToast(result.message);
        console.error('Warranty registration failed:', result.message);
    }
}


    // Add click event listener to submit button
    if (submitButton) {
        submitButton.addEventListener('click', function (e) {
            e.preventDefault();
            handleFormSubmission();
        });
    }

    // Clear errors as soon as user starts typing
    inputs.forEach(input => {
        input.addEventListener('input', function () {
            const fieldContainer = this.closest('.login-input-fields-container');

            // Remove error styling and message immediately when user starts typing
            this.classList.remove('field-error');
            const existingError = fieldContainer.querySelector('.field-error-message');
            if (existingError) {
                existingError.remove();
            }

            // 🔒 Restrict Order ID to digits only and max 6 characters
            if (this.id === 'warranty-registration-order-id') {
                this.value = this.value.replace(/[^0-9-]/g, '');
            }
        });

        // Real-time validation on input blur (only format validation, not required)
        input.addEventListener('blur', function () {
            validateField(this, false); // Don't check required on blur, only format validation
        });
    });
});