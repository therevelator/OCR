import { extractStoreAndCategory } from './determine.js';

// Function to process PDF using OCR.Space API
export function processPDF(pdfFile) {
    let apiResponseReceived = false;

    // Show initial processing alert
    Swal.fire({
        title: 'Processing PDF...',
        text: 'Please wait',
        icon: 'info',
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    // Set up a timeout for API response
    const apiTimeout = setTimeout(() => {
        if (!apiResponseReceived) {
            Swal.close();
            Swal.fire({
                title: 'API Unavailable',
                text: 'The OCR API is not responding. Would you like to enter the total manually?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Enter Total',
                cancelButtonText: 'Later',
                customClass: {
                    popup: 'swal-custom-popup',
                    title: 'swal-custom-title',
                    content: 'swal-custom-content',
                    confirmButton: 'swal-custom-confirm-button',
                    cancelButton: 'swal-custom-cancel-button'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    promptManualEntry();
                }
            });
        }
    }, 20000); // Increased timeout for PDF processing

    // Create a new FormData object
    const formData = new FormData();
    formData.append("file", pdfFile);
    formData.append("apikey", "K81817575788957"); // Replace with your actual API key
    formData.append("language", "eng");
    formData.append("isTable", true);
    formData.append("OCREngine", 2);
    formData.append("filetype", "pdf");

    // Make the API call to OCR.Space
    fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        apiResponseReceived = true;
        clearTimeout(apiTimeout);
        Swal.close();
        processPDFResult(result);
    })
    .catch(error => {
        apiResponseReceived = true;
        clearTimeout(apiTimeout);
        Swal.close();
        console.error('OCR API error:', error);
        Swal.fire({
            title: 'Error',
            text: 'Failed to process PDF. Please try again or enter the total manually.',
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'Enter Manually',
            cancelButtonText: 'Try Again',
            customClass: {
                popup: 'swal-custom-popup',
                title: 'swal-custom-title',
                content: 'swal-custom-content',
                confirmButton: 'swal-custom-confirm-button',
                cancelButton: 'swal-custom-cancel-button'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                promptManualEntry();
            }
        });
    });
}

function processPDFResult(result) {
    if (result.ParsedResults && result.ParsedResults.length > 0) {
        const extractedText = result.ParsedResults[0].ParsedText;
        const { store, category } = extractStoreAndCategory(extractedText);
        const extractedTotal = extractTotal(extractedText);
        
        console.log(`Receipt from: ${store}, Category: ${category}`);
        
        if (extractedTotal !== null) {
            // Update the total display with store name and category
            document.getElementById('totalAmount').innerText = `Total from ${store} (${category}): ${extractedTotal.toFixed(2)} ${selectedCurrency}`;
            
            // Show success message with store name and category
            Swal.fire({
                title: 'Success!',
                text: `Total extracted from ${store} (${category}): ${extractedTotal.toFixed(2)} ${selectedCurrency}`,
                icon: 'success',
                customClass: {
                    popup: 'swal-custom-popup',
                    title: 'swal-custom-title',
                    content: 'swal-custom-content',
                    confirmButton: 'swal-custom-confirm-button'
                }
            });

            // Save total to history with store name and category
            const now = new Date();
            const timestamp = now.toLocaleString();
            const date = now.toISOString().split('T')[0];
            saveTotalToHistory(extractedTotal.toFixed(2), timestamp, date, store, category);
            
            updateHistoryDisplay();
        } else {
            Swal.fire({
                title: 'No Total Found',
                text: 'Unable to extract a total from the PDF. Would you like to enter it manually?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Enter Manually',
                cancelButtonText: 'Cancel',
                customClass: {
                    popup: 'swal-custom-popup',
                    title: 'swal-custom-title',
                    content: 'swal-custom-content',
                    confirmButton: 'swal-custom-confirm-button',
                    cancelButton: 'swal-custom-cancel-button'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    promptManualEntry();
                }
            });
        }
    } else {
        throw new Error('No text found in the PDF');
    }
}

// You'll need to import or define these functions:
// extractTotal, saveTotalToHistory, updateHistoryDisplay, promptManualEntry
