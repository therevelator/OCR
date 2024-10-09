async function preprocessImage(imageFile) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Apply preprocessing
            ctx.drawImage(img, 0, 0);
            ctx.filter = 'contrast(1.5) grayscale(1)';
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob(resolve, 'image/png');
        };
        img.src = URL.createObjectURL(imageFile);
    });
}

// Multiple recognition attempts
async function multipleRecognitionAttempts(imageFile) {
    const attempts = [
        Tesseract.recognize(imageFile, 'eng'),
        Tesseract.recognize(imageFile, 'eng_best'),
        Tesseract.recognize(await preprocessImage(imageFile), 'eng')
    ];
    const results = await Promise.all(attempts);
    // Choose the best result based on confidence scores
    return results.reduce((best, current) => 
        current.data.confidence > best.data.confidence ? current : best
    );
}

async function performOCR(imageFile) {
    try {
        const result = await multipleRecognitionAttempts(imageFile);
        return result.data.text;
    } catch (error) {
        console.error('Error during OCR:', error);
        throw error;
    }
}

async function processImage() {
    const imageInput = document.getElementById('imageInput');
    const file = imageInput.files[0];

    if (!file) {
        Swal.fire('Error', 'Please select an image file.', 'error');
        return;
    }

    try {
        Swal.fire({
            title: 'Processing...',
            text: 'Please wait while we analyze the image.',
            allowOutsideClick: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });

        const text = await performOCR(file);
        
        const { value: correctedText, isDismissed } = await Swal.fire({
            title: 'Verify Recognized Text',
            input: 'textarea',
            inputValue: text,
            inputAttributes: {
                'aria-label': 'Recognized text'
            },
            showCancelButton: true,
            confirmButtonText: 'Process',
            cancelButtonText: 'Cancel'
        });

        if (isDismissed) {
            Swal.fire('Cancelled', 'OCR process was cancelled', 'info');
            return;
        }

        if (correctedText) {
            // Show processing modal again
            Swal.fire({
                title: 'Processing...',
                text: 'Please wait while we analyze the data.',
                allowOutsideClick: false,
                showConfirmButton: false,
                willOpen: () => {
                    Swal.showLoading();
                }
            });

            await sendToOllamaController(correctedText);
        }
    } catch (error) {
        console.error('Error processing image:', error);
        Swal.fire('Error', 'Error processing image. Please try again.', 'error');
    }
}

async function sendToOllamaController(text) {
    try {
        const response = await fetch('/api/ollama/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log('Response from OllamaController:', data);
        Swal.close(); // Close the processing modal
        handleOllamaResponse(data); // This function should be defined in app.js
    } catch (error) {
        console.error('Error sending data to OllamaController:', error);
        Swal.fire('Error', 'Error processing the OCR result. Please try again.', 'error');
    }
}

// Event listener for file input change
document.getElementById('imageInput').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imagePreview').src = e.target.result;
            document.getElementById('previewContainer').classList.remove('hidden');
        }
        reader.readAsDataURL(file);
    }
});
