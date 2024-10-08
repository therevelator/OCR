package com.expense.controller;

import java.awt.image.BufferedImage;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

import javax.imageio.ImageIO;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/ollama")
public class OllamaController {

    private static final String OCR_API_KEY = "K81817575788957";  // Replace with your actual API key
    private static final String OCR_SPACE_URL = "https://api.ocr.space/parse/image";
    private static final String OLLAMA_CLI_PATH = "/usr/local/bin/ollama";  // Path to the Ollama CLI
    private static final String MODEL_NAME = "llama3.2";  // Specify the model
    private static final int MAX_FILE_SIZE_MB = 1;  // Max file size in MB

    @PostMapping(value = "/generate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> generateFromImage(@RequestPart("image") MultipartFile imageFile) {
        try {
            // Save the image temporarily
            String originalFilename = imageFile.getOriginalFilename();
            File tempImage = File.createTempFile("uploaded-image", getFileExtension(originalFilename));
            Path tempFilePath = tempImage.toPath();
            Files.copy(imageFile.getInputStream(), tempFilePath, StandardCopyOption.REPLACE_EXISTING);

            // Resize the image if it exceeds the maximum file size
            File resizedImage = resizeImageIfNeeded(tempImage, MAX_FILE_SIZE_MB);

            // Send image to OCR.Space for processing
            String ocrText = getTextFromOCRSpace(resizedImage);

            // Remove the temporary image
            Files.delete(tempFilePath);

            if (ocrText == null || ocrText.isEmpty()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to extract text from image.");
            }

            // Create the prompt for Ollama to process
            String prompt = "You are an assistant tasked with extracting data from OCR text. "
            + "Extract the store name, store category, total, and purchases (product name and price) from the provided OCR text. "
            + "Categorize each purchase based on the product description. The list of possible categories includes: "
            + "food, beverages, clothing, electronics, home goods, furniture, health & beauty, personal care, "
            + "cleaning supplies, toys & games, stationery, sporting goods, books & media, automotive, hardware & tools, "
            + "pharmacy, pet supplies, gardening, jewelry & accessories, footwear, office supplies, baby products, "
            + "kitchenware, appliances, tobacco & alcohol, gifts & souvenirs, travel & luggage, cosmetics & fragrance, "
            + "entertainment, and fitness & wellness. For store_category, replace the value by inferring the store type. if not, put Other\n\n"
            + "the total could be total, total lei, but not numerar lei. Exclude total tva and total tva bon and anything containing total and tva or vat \n\n"
            + "Return the data in the following simplified JSON format, no explanations, no notes, nothing but the JSON:\n\n"
            + "{\n"
            + "  \"store\": \"store anme here\",\n"
            + "  \"store_category\": \"store category here\",\n"
            + "  \"date\": \"date here\",\n"
            + "  \"total\": \"total here\",\n"
            + "  \"purchases\": [\n"
            + "    {\n"
            + "      \"product_name\": \"product name here\",\n"
            + "      \"price\": \"4.98\"\n"
            + "    },\n"
            + "    {\n"
            + "      \"product_name\": \"product name here\",\n"
            + "      \"price\": \"6.99\"\n"
            + "    },\n"
            + "    {\n"
            + "      \"product_name\": \"product name here\",\n"
            + "      \"price\": \"36.30\"\n"
            + "    }\n"
            + "  ]\n"
            + "}\n\n" + ocrText;

            // Run the Ollama CLI command
            ProcessBuilder ollamaProcessBuilder = new ProcessBuilder(OLLAMA_CLI_PATH, "run", MODEL_NAME);
            Process ollamaProcess = ollamaProcessBuilder.start();

            // Pass the prompt to Ollama model
            try (OutputStreamWriter writer = new OutputStreamWriter(ollamaProcess.getOutputStream(), StandardCharsets.UTF_8)) {
                writer.write(prompt);
                writer.flush();
            }

            // Capture the output from the AI process
            BufferedReader ollamaReader = new BufferedReader(new InputStreamReader(ollamaProcess.getInputStream()));
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = ollamaReader.readLine()) != null) {
                output.append(line).append("\n");
            }
            ollamaProcess.waitFor();
            // Print the AI's response to the console
        System.out.println("AI Response:");
        System.out.println(output.toString());

            // Parse the cleaned response into JSON
            ObjectMapper mapper = new ObjectMapper();
            JsonNode jsonOutput = mapper.readTree(output.toString());

            // Return the JSON response
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(jsonOutput));

        } catch (Exception e) {
            // Handle errors
            String errorMessage = "Error processing image or running Ollama: " + e.getMessage();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMessage);
        }
    }

    // Helper method to get the file extension from the original filename
    private String getFileExtension(String filename) {
        if (filename != null && filename.lastIndexOf('.') > 0) {
            return filename.substring(filename.lastIndexOf('.'));
        }
        return ""; // Default to no extension if none found
    }

    // Method to resize the image if it exceeds the maximum allowed file size
    private File resizeImageIfNeeded(File imageFile, int maxSizeMB) throws Exception {
        // Check the file size
        long fileSizeInBytes = Files.size(imageFile.toPath());
        long fileSizeInMB = fileSizeInBytes / (1024 * 1024);

        if (fileSizeInMB <= maxSizeMB) {
            return imageFile;  // No need to resize
        }

        // Resize the image using ImageIO
        BufferedImage image = ImageIO.read(imageFile);
        int originalWidth = image.getWidth();
        int originalHeight = image.getHeight();

        // Calculate the scaling factor to resize the image
        double scaleFactor = Math.sqrt((double) maxSizeMB / fileSizeInMB);

        int newWidth = (int) (originalWidth * scaleFactor);
        int newHeight = (int) (originalHeight * scaleFactor);

        BufferedImage resizedImage = new BufferedImage(newWidth, newHeight, image.getType());
        resizedImage.getGraphics().drawImage(image, 0, 0, newWidth, newHeight, null);

        // Save the resized image as a temporary file
        File resizedTempImage = File.createTempFile("resized-image", ".jpg");
        ImageIO.write(resizedImage, "jpg", resizedTempImage);

        return resizedTempImage;
    }

    // Method to send image to OCR.Space API and get the text
    private String getTextFromOCRSpace(File imageFile) throws Exception {
        String boundary = Long.toHexString(System.currentTimeMillis()); // Random boundary for multipart/form-data
        String CRLF = "\r\n";  // Line separator for HTTP
        URL url = new URL(OCR_SPACE_URL);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setDoOutput(true);
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
        connection.setRequestProperty("apikey", OCR_API_KEY);

        // Send the file in the request
        try (OutputStream output = connection.getOutputStream();
             PrintWriter writer = new PrintWriter(new OutputStreamWriter(output, StandardCharsets.UTF_8), true)) {

            // Send binary file
            writer.append("--").append(boundary).append(CRLF);
            writer.append("Content-Disposition: form-data; name=\"file\"; filename=\"" + imageFile.getName() + "\"").append(CRLF);
            writer.append("Content-Type: image/jpeg").append(CRLF); // Adjust based on your image type
            writer.append(CRLF).flush();

            Files.copy(imageFile.toPath(), output);
            output.flush(); // Ensure the file is written
            writer.append(CRLF).flush(); // End of file part

            // Include additional form data
            writer.append("--").append(boundary).append(CRLF);
            writer.append("Content-Disposition: form-data; name=\"language\"").append(CRLF);
            writer.append(CRLF).append("eng").append(CRLF).flush();

            writer.append("--").append(boundary).append(CRLF);
            writer.append("Content-Disposition: form-data; name=\"OCREngine\"").append(CRLF);
            writer.append(CRLF).append("2").append(CRLF).flush();

            writer.append("--").append(boundary).append(CRLF);
            writer.append("Content-Disposition: form-data; name=\"isTable\"").append(CRLF);
            writer.append(CRLF).append("true").append(CRLF).flush();

            // End of multipart/form-data
            writer.append("--").append(boundary).append("--").append(CRLF).flush();
        }

        // Get the response from OCR.Space
        int responseCode = connection.getResponseCode();
        if (responseCode == HttpURLConnection.HTTP_OK) {
            BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8));
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line).append(CRLF);
            }
            reader.close();

            // Parse the JSON response from OCR.Space
            ObjectMapper mapper = new ObjectMapper();
            JsonNode jsonResponse = mapper.readTree(response.toString());
            System.out.println(jsonResponse);
            // Return the OCR text if available
            if (jsonResponse.has("ParsedResults") && jsonResponse.get("ParsedResults").isArray()) {
                return jsonResponse.get("ParsedResults").get(0).get("ParsedText").asText();
            }
        }

        return null; // Return null if OCR failed
    }
}