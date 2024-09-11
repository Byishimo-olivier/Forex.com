<?php
// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "forex_bureau";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $fromCurrency = $_POST['fromCurrency'];
    $toCurrency = $_POST['toCurrency'];
    $amount = $_POST['amount'];
    $userId = 1; // Replace this with the actual user ID from your session or user authentication system

    // Fetch exchange rate
    $apiUrl = "https://api.exchangerate-api.com/v4/latest/$fromCurrency";
    $response = file_get_contents($apiUrl);
    $data = json_decode($response, true);

    if (isset($data['rates'][$toCurrency])) {
        $rate = $data['rates'][$toCurrency];
        $convertedAmount = $amount * $rate;

        // Insert transaction into the database
        $stmt = $conn->prepare("INSERT INTO transactions (user_id, from_currency, to_currency, amount, converted_amount) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("issdd", $userId, $fromCurrency, $toCurrency, $amount, $convertedAmount);

        if ($stmt->execute()) {
            echo "Converted Amount: " . number_format($convertedAmount, 2) . " " . $toCurrency;
        } else {
            echo "Error: " . $stmt->error;
        }

        $stmt->close();
    } else {
        echo "Error: Invalid currency.";
    }
}

$conn->close();
?>
