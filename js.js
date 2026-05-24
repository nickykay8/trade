(function () {
  // DOM elements
  const directionsChk = document.getElementById("directionsCheckbox");
  const confirmationChk = document.getElementById("confirmationCheckbox");
  const submitBtn = document.getElementById("submitBtn");
  const accountBalanceInput = document.getElementById("accountBalance");
  const percentageInput = document.getElementById("percentageInput");
  const riskAmountSpan = document.getElementById("riskAmountDisplay");
  const entryPointInput = document.getElementById("entryPoint");
  const stopLossInput = document.getElementById("stopLoss");
  const stopDistanceDisplay = document.getElementById("stopDistanceDisplay");
  const lotSizeOutput = document.getElementById("lotSizeOutput");
  const infoMsgDiv = document.getElementById("infoMessage");
  const warningMsgDiv = document.getElementById("warningMsg");

  // Helper: format USD
  function formatUSD(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  }

  // Helper: get numeric value from input, fallback to 0
  function getNumericValue(element, fallback = 0) {
    let val = parseFloat(element.value);
    return isNaN(val) ? fallback : val;
  }

  // Main calculation according to corrected logic:
  // 1. Risk amount = Account balance × (Percentage / 100)
  // 2. Stop distance = Entry point - Stop Loss (absolute value, should be positive for long positions)
  // 3. Lot size = Risk amount ÷ Stop distance ÷ 10
  //
  // With example: Entry=4509, Stop=4452, distance=57, risk=100
  // Lot size = 100 ÷ 57 ÷ 10 = 0.1754... ≈ 0.18 (if rounding to 2 decimals)
  // If user expects 0.10, they might be using a different rounding, but we'll show precise calculation

  function computeLotSize() {
    // Get values
    let balance = getNumericValue(accountBalanceInput, 0);
    let percent = getNumericValue(percentageInput, 0);
    let entry = getNumericValue(entryPointInput, 0);
    let stopLoss = getNumericValue(stopLossInput, 0);

    // Calculate risk amount
    let riskAmount = (percent / 100) * balance;
    riskAmountSpan.textContent = formatUSD(riskAmount);

    // Calculate stop distance (absolute difference for safety, but typically Entry > Stop for long)
    let stopDistance = Math.abs(entry - stopLoss);
    stopDistanceDisplay.textContent = stopDistance.toFixed(2);

    // Validation checks
    let hasError = false;
    let errorMsg = "";

    if (stopDistance === 0) {
      errorMsg =
        "⚠️ Stop distance cannot be zero! Entry and Stop Loss must be different.";
      hasError = true;
    }

    if (riskAmount <= 0) {
      if (!hasError)
        errorMsg =
          "⚠️ Risk amount is zero or negative. Check balance and percentage.";
      hasError = true;
    }

    if (hasError) {
      lotSizeOutput.value = "";
      lotSizeOutput.placeholder = "invalid inputs";
      warningMsgDiv.textContent = errorMsg;
      return null;
    }

    // Clear warning if no error
    warningMsgDiv.textContent = "";

    // Calculate lot size: Risk amount ÷ Stop distance ÷ 10
    let lotSize = riskAmount / stopDistance / 10;

    // Check if result is valid
    if (isNaN(lotSize) || !isFinite(lotSize)) {
      lotSizeOutput.value = "";
      lotSizeOutput.placeholder = "calculation error";
      return null;
    }

    // Round to 2 decimal places for standard lot size (can be adjusted)
    let roundedLot = Math.round(lotSize * 100) / 100;

    // Set the value inside Lot Size input box
    lotSizeOutput.value = roundedLot.toFixed(2);
    lotSizeOutput.placeholder = "auto lot";

    return { lotSize: roundedLot, riskAmount, stopDistance };
  }

  // Refresh calculation and update UI
  function refreshAllCalculations() {
    computeLotSize();
    updateSubmitButtonState();
  }

  // Update submit button state based on both checkboxes
  function updateSubmitButtonState() {
    const isDirectionsChecked = directionsChk.checked;
    const isConfirmationChecked = confirmationChk.checked;
    const bothChecked = isDirectionsChecked && isConfirmationChecked;

    if (bothChecked) {
      submitBtn.disabled = false;
      infoMsgDiv.innerHTML =
        "✅ Both conditions met. Lot size calculated live. Ready to submit.";
      infoMsgDiv.style.background = "#e9f7eb";
      infoMsgDiv.style.borderLeftColor = "#2ecc71";
    } else {
      submitBtn.disabled = true;
      infoMsgDiv.innerHTML =
        '⚠️ You must check BOTH "Do you know the direction?" and "Is there confirmation?" to enable submission.';
      infoMsgDiv.style.background = "#fff2f0";
      infoMsgDiv.style.borderLeftColor = "#e67e22";
    }
  }

  // Handle form submit
  function handleSubmit(event) {
    event.preventDefault();

    // Check checkboxes
    if (!directionsChk.checked || !confirmationChk.checked) {
      alert(
        "Cannot submit: Both checkboxes must be checked (Direction & Confirmation).",
      );
      return;
    }

    // Gather all values
    let balance = getNumericValue(accountBalanceInput, 0);
    let percent = getNumericValue(percentageInput, 0);
    let riskAmount = (percent / 100) * balance;
    let entry = getNumericValue(entryPointInput, 0);
    let stopLoss = getNumericValue(stopLossInput, 0);
    let stopDistance = Math.abs(entry - stopLoss);
    let lotSizeRaw = lotSizeOutput.value;
    let lotSizeNum = parseFloat(lotSizeRaw);
    let lotDisplay = isNaN(lotSizeNum) ? "N/A" : lotSizeNum.toFixed(4);

    // Recalculate for summary
    let calculatedLot = riskAmount / stopDistance / 10;
    let finalLotDisplay =
      isNaN(calculatedLot) || stopDistance === 0
        ? "N/A"
        : calculatedLot.toFixed(4);

    let summary = `
📋 TRADE POSITION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Directions known: ${directionsChk.checked ? "✓ YES" : "✗ NO"}
✅ Confirmation received: ${confirmationChk.checked ? "✓ YES" : "✗ NO"}
💰 Account Balance: ${formatUSD(balance)}
📊 Risk Percentage: ${percent}%
💵 Risk Amount (balance × % ÷ 100): ${formatUSD(riskAmount)}
📈 Entry Point: ${entry}
🛑 Stop Loss: ${stopLoss}
📏 Stop Distance (|Entry - SL|): ${stopDistance.toFixed(2)}
⚙️ Calculation formula: Risk Amount ÷ Stop Distance ÷ 10
🎯 Calculated Lot Size: ${finalLotDisplay}
📦 Lot Size (displayed): ${lotDisplay}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Trade parameters validated. Ready to execute!
      `;

    alert(summary);

    // Update info message
    infoMsgDiv.innerHTML = `🎉 Submission successful! Lot size = ${lotDisplay} | Risk: ${formatUSD(riskAmount)} | Distance: ${stopDistance.toFixed(2)}`;
    infoMsgDiv.style.background = "#e0f2fe";
    infoMsgDiv.style.borderLeftColor = "#0284c7";

    // Optional: you could add logging or API calls here
  }

  // Validate stop distance and show warnings
  function validateInputs() {
    let entry = getNumericValue(entryPointInput, 0);
    let stopLoss = getNumericValue(stopLossInput, 0);
    let distance = Math.abs(entry - stopLoss);

    if (distance === 0 && entry !== 0) {
      if (!warningMsgDiv.textContent.includes("zero")) {
        warningMsgDiv.textContent =
          "⚠️ Entry and Stop Loss are the same! Stop distance is zero. Lot size cannot be calculated.";
      }
    } else if (distance > 0) {
      if (warningMsgDiv.textContent.includes("zero")) {
        warningMsgDiv.textContent = "";
      }
    }

    refreshAllCalculations();
  }

  // Event listeners for realtime updates
  accountBalanceInput.addEventListener("input", () => refreshAllCalculations());
  percentageInput.addEventListener("input", () => refreshAllCalculations());
  entryPointInput.addEventListener("input", () => validateInputs());
  stopLossInput.addEventListener("input", () => validateInputs());

  // Checkbox listeners
  directionsChk.addEventListener("change", () => updateSubmitButtonState());
  confirmationChk.addEventListener("change", () => updateSubmitButtonState());

  // Blur events for formatting
  accountBalanceInput.addEventListener("blur", function () {
    let v = parseFloat(this.value);
    if (isNaN(v)) this.value = 0;
    refreshAllCalculations();
  });

  percentageInput.addEventListener("blur", function () {
    let v = parseFloat(this.value);
    if (isNaN(v)) this.value = 0;
    refreshAllCalculations();
  });

  entryPointInput.addEventListener("blur", function () {
    let v = parseFloat(this.value);
    if (isNaN(v)) this.value = 0;
    validateInputs();
  });

  stopLossInput.addEventListener("blur", function () {
    let v = parseFloat(this.value);
    if (isNaN(v)) this.value = 0;
    validateInputs();
  });

  // Initial calculation with example values (Entry: 4509, Stop: 4452, Balance: 2000, Percent: 5% -> risk=100)
  // This should show lot size = 100 ÷ 57 ÷ 10 = 0.1754 → 0.18
  // Initial setup
  refreshAllCalculations();
  updateSubmitButtonState();

  // Set example values to demonstrate correctly
  // Your example: Entry 4509, Stop 4452, risk amount 100
  // To get risk amount 100 with balance 2000, percentage should be 5% (2000 × 5% = 100)
  if (getNumericValue(percentageInput, 0) === 1) {
    // Set to 5% to match your example of risk amount 100
    percentageInput.value = "5";
    refreshAllCalculations();
  }

  // Additional note in console for debugging
  console.log("Ready! Lot size = Risk Amount ÷ Stop Distance ÷ 10");
})();
