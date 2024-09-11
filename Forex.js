$(document).ready(function() {
    const apiURL = 'https://api.exchangerate-api.com/v4/latest/USD';

    // Fetching the list of currencies
    $.get(apiURL, function(data) {
        const fromCurrency = $('#fromCurrency');
        const toCurrency = $('#toCurrency');

        // Populating the currency dropdowns
        $.each(data.rates, function(code, rate) {
            fromCurrency.append(`<option value="${code}">${code}</option>`);
            toCurrency.append(`<option value="${code}">${code}</option>`);
        });
    });

    // Handling form submission
    $('#converter-form').on('submit', function(e) {
        e.preventDefault();

        const fromCurrency = $('#fromCurrency').val();
        const toCurrency = $('#toCurrency').val();
        const amount = $('#amount').val();

        $.ajax({
            url: `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`,
            type: 'GET',
            success: function(response) {
                const rate = response.rates[toCurrency];
                const convertedAmount = amount * rate;
                $('#result').text(`Converted Amount: ${convertedAmount.toFixed(2)} ${toCurrency}`);
            },
            error: function(error) {
                console.error('Error fetching exchange rates:', error);
                $('#result').text('Error fetching exchange rates. Please try again.');
            }
        });
    });
});
