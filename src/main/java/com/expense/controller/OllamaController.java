package com.expense.controller;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/ollama")
public class OllamaController {

    private static final Logger logger = LoggerFactory.getLogger(OllamaController.class);

    private static final String OLLAMA_CLI_PATH = "ollama";
    private static final String MODEL_NAME = "gemma2:2b";

    @PostMapping("/process")
    public ResponseEntity<String> processOcrText(@RequestBody OcrRequest request) {
        try {
            logger.info("Received OCR text: {}", request.getText());
            
            // Create the prompt for Ollama to process
            String prompt = createPrompt(request.getText());
            logger.info("Created prompt: {}", prompt);

            // Run the Ollama CLI command
            ProcessBuilder ollamaProcessBuilder = new ProcessBuilder(OLLAMA_CLI_PATH, "run", MODEL_NAME);
            logger.info("Starting Ollama process with command: {}", String.join(" ", ollamaProcessBuilder.command()));
            Process ollamaProcess = ollamaProcessBuilder.start();

            // Pass the prompt to Ollama model
            try (OutputStreamWriter writer = new OutputStreamWriter(ollamaProcess.getOutputStream())) {
                writer.write(prompt);
                writer.flush();
                logger.info("Prompt sent to Ollama");
            }

            // Capture the output from the AI process
            BufferedReader ollamaReader = new BufferedReader(new InputStreamReader(ollamaProcess.getInputStream()));
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = ollamaReader.readLine()) != null) {
                output.append(line).append("\n");
            }
            int exitCode = ollamaProcess.waitFor();
            logger.info("Ollama process exited with code: {}", exitCode);

            logger.info("Ollama response: {}", output);

            // Clean the output by removing Markdown code block delimiters
            String cleanedOutput = cleanOllamaOutput(output.toString());

            // Parse the cleaned response into JSON
            ObjectMapper mapper = new ObjectMapper();
            JsonNode jsonOutput = mapper.readTree(cleanedOutput);

            // Return the JSON response
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(jsonOutput));

        } catch (Exception e) {
            logger.error("Error processing OCR text or running Ollama", e);
            String errorMessage = "Error processing OCR text or running Ollama: " + e.getMessage();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMessage);
        }
    }

    private String createPrompt(String ocrText) {
        return "You are an assistant tasked with extracting data from OCR text. "
                + "Extract the store name, store category, total, and purchases (product name and price) from the provided OCR text. "
                + "Categorize each purchase based on the product description. The list of possible categories includes: "
                + "food, beverages, clothing, electronics, home goods, furniture, health & beauty, personal care, "
                + "cleaning supplies, toys & games, stationery, sporting goods, books & media, automotive, hardware & tools, "
                + "pharmacy, pet supplies, gardening, jewelry & accessories, footwear, office supplies, baby products, "
                + "kitchenware, appliances, tobacco & alcohol, gifts & souvenirs, travel & luggage, cosmetics & fragrance, "
                + "entertainment, and fitness & wellness. For store_category, replace the value by inferring the store type. if not, put Other\n\n"
                + "the total could be total, total lei, but DO NOT INCLUDE numerar lei. ALSO EXCLUDE total tva and total tva bon and anything containing total and tva or vat \n\n"
                + "Return the data in the following simplified JSON format, no explanations, no notes, nothing but the JSON:\n\n"
                + "{\n"
                + "  \"store\": \"store name here\",\n"
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
    }

    private String cleanOllamaOutput(String output) {
        // Remove Markdown code block delimiters and any "json" language identifier
        String cleaned = output.replaceAll("```json\\s*", "").replaceAll("```\\s*", "");
        // Trim any leading or trailing whitespace
        return cleaned.trim();
    }
}

class OcrRequest {
    private String text;

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }
}