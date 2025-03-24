
// Medication data
const medications = {
  paracetamol: {
    name: 'Paracetamol',
    doseAmount: 500,
    maxDailyDose: 4000,
    minTimeBetweenDoses: 4 * 60 * 60 * 1000, // 4 hours in milliseconds
    history: [],
    element: {}
  },
  ibuprofen: {
    name: 'Ibuprofen',
    doseAmount: 400,
    maxDailyDose: 2400,
    minTimeBetweenDoses: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
    history: [],
    element: {}
  }
};

// DOM elements
document.addEventListener('DOMContentLoaded', function() {
  // Initialize elements for each medication
  for (const med in medications) {
    medications[med].element = {
      lastTaken: document.getElementById(`${med}-last-taken`),
      nextDose: document.getElementById(`${med}-next-dose`),
      amount: document.getElementById(`${med}-amount`),
      progress: document.getElementById(`${med}-progress`),
      takeButton: document.getElementById(`${med}-take`),
      undoButton: document.getElementById(`${med}-undo`)
    };
    
    // Add event listeners
    medications[med].element.takeButton.addEventListener('click', () => takeMedication(med));
    
    // Setup long-press for undo button
    setupLongPressUndo(med);
  }
  
  // Reset all button
  document.getElementById('resetAll').addEventListener('click', resetAll);
  
  // Load data from localStorage

// Setup long-press for undo button
function setupLongPressUndo(medType) {
  const med = medications[medType];
  const undoButton = med.element.undoButton;
  const holdTime = 1500; // 1.5 seconds hold time
  let timer;
  let progress = 0;
  let isHolding = false;
  
  // Create progress bar for undo button
  const progressBar = document.createElement('div');
  progressBar.className = 'undo-progress';
  undoButton.appendChild(progressBar);
  
  undoButton.addEventListener('mousedown', startHold);
  undoButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startHold();
  });
  
  undoButton.addEventListener('mouseup', cancelHold);
  undoButton.addEventListener('mouseleave', cancelHold);
  undoButton.addEventListener('touchend', cancelHold);
  undoButton.addEventListener('touchcancel', cancelHold);
  
  function startHold() {
    if (med.history.length === 0 || undoButton.disabled) return;
    
    isHolding = true;
    progress = 0;
    progressBar.style.width = '0%';
    progressBar.style.display = 'block';
    
    // Update progress every 10ms
    timer = setInterval(() => {
      if (isHolding) {
        progress += 10;
        progressBar.style.width = `${(progress / holdTime) * 100}%`;
        
        if (progress >= holdTime) {
          // Hold time reached, execute undo
          clearInterval(timer);
          undoLastDose(medType);
          resetProgress();
        }
      }
    }, 10);
  }
  
  function cancelHold() {
    isHolding = false;
    clearInterval(timer);
    resetProgress();
  }
  
  function resetProgress() {
    setTimeout(() => {
      progressBar.style.width = '0%';
      progressBar.style.display = 'none';
    }, 200);
  }
}

  loadData();
  
  // Start update loop
  updateDisplay();
  setInterval(updateDisplay, 60000); // Update every minute
});

// Take a dose of medication
function takeMedication(medType) {
  const med = medications[medType];
  const now = new Date();
  
  med.history.push({
    timestamp: now.getTime(),
    dose: med.doseAmount
  });
  
  saveData();
  updateDisplay();
}

// Undo the last dose
function undoLastDose(medType) {
  const med = medications[medType];
  
  if (med.history.length > 0) {
    med.history.pop();
    saveData();
    updateDisplay();
  }
}

// Reset all data
function resetAll() {
  if (confirm('Are you sure you want to reset all medication history?')) {
    for (const med in medications) {
      medications[med].history = [];
    }
    saveData();
    updateDisplay();
  }
}

// Save data to localStorage
function saveData() {
  const data = {};
  
  for (const med in medications) {
    data[med] = {
      history: medications[med].history
    };
  }
  
  localStorage.setItem('medicationData', JSON.stringify(data));
}

// Load data from localStorage
function loadData() {
  const data = localStorage.getItem('medicationData');
  
  if (data) {
    const parsedData = JSON.parse(data);
    
    for (const med in medications) {
      if (parsedData[med]) {
        medications[med].history = parsedData[med].history;
      }
    }
  }
}

// Update the display
function updateDisplay() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  for (const medType in medications) {
    const med = medications[medType];
    
    // Filter today's doses
    const todayDoses = med.history.filter(dose => 
      dose.timestamp >= today.getTime() 
    );
    
    // Calculate total taken today
    const totalToday = todayDoses.reduce((total, dose) => total + dose.dose, 0);
    
    // Find the last dose
    const lastDose = med.history.length > 0 
      ? med.history[med.history.length - 1] 
      : null;
    
    // Update the display elements
    updateLastTaken(med, lastDose);
    updateNextDose(med, lastDose, now);
    updateDailyAmount(med, totalToday);
    updateUndoButton(med);
  }
}

// Update the last taken display
function updateLastTaken(med, lastDose) {
  if (lastDose) {
    const date = new Date(lastDose.timestamp);
    med.element.lastTaken.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    med.element.lastTaken.textContent = 'Never';
  }
}

// Update the next dose display
function updateNextDose(med, lastDose, now) {
  if (!lastDose) {
    med.element.nextDose.textContent = 'Available now';
    med.element.nextDose.className = 'green-text';
    med.element.takeButton.disabled = false;
    return;
  }
  
  const nextDoseTime = lastDose.timestamp + med.minTimeBetweenDoses;
  const timeUntilNextDose = nextDoseTime - now.getTime();
  
  if (timeUntilNextDose <= 0) {
    med.element.nextDose.textContent = 'Available now';
    med.element.nextDose.className = 'green-text';
    med.element.takeButton.disabled = false;
  } else {
    const hours = Math.floor(timeUntilNextDose / (60 * 60 * 1000));
    const minutes = Math.floor((timeUntilNextDose % (60 * 60 * 1000)) / (60 * 1000));
    
    med.element.nextDose.textContent = `${hours}h ${minutes}m`;
    med.element.nextDose.className = 'red-text';
    med.element.takeButton.disabled = true;
  }
}

// Update the daily amount display
function updateDailyAmount(med, totalToday) {
  // Update text
  med.element.amount.textContent = `${totalToday}mg`;
  
  // Update progress bar
  const percentage = (totalToday / med.maxDailyDose) * 100;
  med.element.progress.style.width = `${percentage}%`;
  
  // Update color based on percentage
  if (percentage >= 75) {
    med.element.progress.className = 'progress-bar danger';
  } else if (percentage >= 50) {
    med.element.progress.className = 'progress-bar warning';
  } else {
    med.element.progress.className = 'progress-bar';
  }
  
  // Disable take button if max daily dose reached
  if (totalToday + med.doseAmount > med.maxDailyDose) {
    med.element.takeButton.disabled = true;
  }
}

// Update the undo button
function updateUndoButton(med) {
  med.element.undoButton.disabled = med.history.length === 0;
}
