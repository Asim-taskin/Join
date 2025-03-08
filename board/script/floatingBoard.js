function setPriorityFloatingEdit(priority) {
  let allButtons = document.querySelectorAll('.priority-button-urgentFloating, .priority-button-mediumFloating, .priority-button-lowFloating');
  let selectedButtons = document.querySelectorAll(`.priority-button-${priority}`);
  if (selectedButtons.length === 0) {
    return;
  }
  let selectedButton = selectedButtons[0];
  if (selectedButton.classList.contains('active')) {
    selectedButton.classList.remove('active');
  } else {
    allButtons.forEach(button => button.classList.remove('active'));
    selectedButton.classList.add('active');
  }
}

async function deleteTaskFromFirebase() {
  if (!currentTaskId) {
    return;
  }
  try {
    const url = `https://join-360-1d879-default-rtdb.europe-west1.firebasedatabase.app/taskData/${currentTaskId}.json`;
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(`Fehler beim Löschen des Tasks: ${response.statusText}`);
    }
    document.getElementById("toggleModalFloating").style.display = "none";
    location.reload();
  } catch (error) {}
}
