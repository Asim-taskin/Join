// ------------------------------
// GLOBAL VARIABLES
// ------------------------------
/**
 * Current task that is being accessed.
 * @global
 * @type {Object|null}
 */
window.currentTask = null;
/**
 * ID of the current task.
 * @global
 * @type {string|null}
 */
window.currentTaskId = null;

// ------------------------------
// SUBTASK & PRIORITY HANDLING
// ------------------------------

/**
 * Updates the status of a subtask and adjusts the progress accordingly.
 * @param {string} taskId - ID of the task.
 * @param {number} subtaskIndex - Index of the subtask.
 * @param {boolean} newStatus - New status (true = completed).
 */
function updateSubtaskStatus(taskId, subtaskIndex, newStatus) {
  if (!window.currentTask || window.currentTaskId !== taskId) return;
  window.currentTask.subtasks[subtaskIndex].completed = newStatus;
  const total = window.currentTask.subtasks.length,
        completed = window.currentTask.subtasks.filter(st => st.completed).length,
        newProgress = total ? (completed / total) * 100 : 0;
  const url = `https://join-360-1d879-default-rtdb.europe-west1.firebasedatabase.app/taskData/${taskId}.json`;
  fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subtasks: window.currentTask.subtasks, progress: newProgress })
  })
  .then(r => { if (!r.ok) throw new Error("Error updating subtask status."); })
  .catch(err => {});
}

/**
 * Returns a textual label for the priority based on the icon path.
 * @param {string} iconPath - Path of the priority icon.
 * @returns {string} "Urgent", "Medium", "Low" or "Unknown".
 */
function getPriorityLabel(iconPath) {
  if (!iconPath) return "Unknown";
  if (iconPath.includes("urgent")) return "Urgent";
  if (iconPath.includes("medium")) return "Medium";
  if (iconPath.includes("low")) return "Low";
  return "Unknown";
}

/**
 * Extracts the priority from the icon path.
 * @param {string} iconPath - Path of the priority icon.
 * @returns {string} "urgent", "medium" or "low" (default: "medium").
 */
function extractPriority(iconPath) {
  if (!iconPath) return 'medium';
  const lower = iconPath.toLowerCase();
  if (lower.includes('urgent')) return 'urgent';
  if (lower.includes('medium')) return 'medium';
  if (lower.includes('low')) return 'low';
  return 'medium';
}

// Added to make extractPriority global
window.extractPriority = extractPriority;  // <-- IMPORTANT LINE

// ------------------------------
// MODAL RENDERING
// ------------------------------

/**
 * Renders the header of the task modal based on the task data.
 * @param {Object} task - The task data.
 * @param {HTMLElement} modal - The modal element.
 */
function renderModalHeader(task, modal) {
  const cat = modal.querySelector('.main-section-task-overlay > div:first-child');
  cat.className = `card-label-${task.category.toLowerCase().includes('technical') ? 'technical-task' : 'user-story'}-modal w445`;
  cat.querySelector('h4').textContent = task.category;
  document.getElementById('modalTitle').innerText = task.title || "No Title";
  document.getElementById('modalDescription').innerText = task.description || "No Description";
  document.getElementById('modalDueDate').innerText = task.dueDate || "No Date";
  document.getElementById('modalPriorityText').innerText = getPriorityLabel(task.priority);
  document.getElementById('modalPriorityIcon').src = task.priority || "";
  const assign = document.getElementById('modalAssignedTo');
  assign.innerHTML = task.users.map(u =>
    `<div class="flexrow profile-names">
       <div class="profile-badge-floating-${u.color || 'gray'}">${u.initials || '?'}</div>
       <span class="account-name">${u.name || 'Unknown'}</span>
     </div>`
  ).join("");
}

/**
 * Renders the subtasks in the task modal.
 * @param {Object} task - The task data.
 */
function renderSubtasks(task) {
  const ms = document.getElementById("modalSubtasks");
  ms.innerHTML = "";
  if (task.subtasks && Array.isArray(task.subtasks)) {
    task.subtasks.forEach((st, i) => {
      const div = document.createElement("div");
      div.classList.add("subtask-container-div-item");
      div.innerHTML = `<div class="flexrow">
                         <input type="checkbox" class="subtask-checkbox" data-index="${i}" ${st.completed ? "checked" : ""}>
                         <span>${st.text}</span>
                       </div>`;
      ms.appendChild(div);
    });
    ms.querySelectorAll(".subtask-checkbox").forEach(cb => {
      cb.addEventListener("change", function () {
        updateSubtaskStatus(window.currentTaskId, parseInt(this.getAttribute("data-index"), 10), this.checked);
      });
    });
  }
}

/**
 * Opens the task modal and populates it with the task data.
 * @param {Object} task - The task to be opened.
 */
function openTaskModal(task) {
  window.currentTask = task;
  window.currentTaskId = task.firebaseKey || task.id;
  const modal = document.getElementById('toggleModalFloating');
  modal.dataset.taskId = window.currentTaskId;
  renderModalHeader(task, modal);
  renderSubtasks(task);
  modal.style.display = 'flex';
}

// ------------------------------
// FIREBASE UPDATE
// ------------------------------

/**
 * Updates the column of a task in Firebase.
 * @param {string} taskId - The ID of the task.
 * @param {string} newColumn - The new column ID.
 * @returns {Promise<void>}
 */
async function updateTaskColumnInFirebase(taskId, newColumn) {
  try {
    const url = `https://join-360-1d879-default-rtdb.europe-west1.firebasedatabase.app/taskData/${taskId}.json`;
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column: newColumn })
    });
    if (!r.ok) throw new Error(`Error updating task column: ${r.statusText}`);
  } catch (e) { }
}

// ------------------------------
// COLUMN CHECK & DRAG & DROP
// ------------------------------

/**
 * Checks all columns (class "task-board-container") and toggles
 * the placeholder image depending on whether tasks are present.
 */
function checkColumns() {
  document.querySelectorAll('.task-board-container').forEach(col => {
    const img = col.querySelector('img');
    if (!img) return;
    const hasTasks = col.querySelectorAll('.draggable-cards').length > 0;
    img.style.display = hasTasks ? 'none' : 'block';
  });
}

/**
 * Sets up drag & drop. Adds event listeners for dragstart and dragend
 * to the cards (class "draggable-cards") and enables dropping in columns (class "task-board-container").
 */
function enableDragAndDrop() {
  document.querySelectorAll('.draggable-cards').forEach(card => {
    card.addEventListener('dragstart', () => card.classList.add('dragging'));
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });
  document.querySelectorAll('.task-board-container').forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      const dragCard = document.querySelector('.dragging');
      if (dragCard) col.appendChild(dragCard);
    });
  });
}

// ------------------------------
// TASK ELEMENT CREATION & GENERATION
// ------------------------------

/**
 * Creates a DOM element for a task.
 * @param {Object} task - The task data.
 * @returns {HTMLElement} The created task element.
 */
function createTaskElement(task) {
  const total = task.subtasks ? task.subtasks.length : 0,
        completed = task.subtasks ? task.subtasks.filter(st => st.completed).length : 0,
        progress = total ? (completed / total) * 100 : 0;
  const mapping = { urgent: "../img/icon-urgent.png", medium: "../img/priority-img/medium.png", low: "../img/icon-low.png" };
  let prio = extractPriority(task.priority); 
  if (!mapping[prio]) prio = "medium";
  const taskPriority = mapping[prio];
  const el = document.createElement("div");
  el.classList.add("draggable-cards");
  el.id = task.firebaseKey || task.id;
  el.setAttribute("draggable", "true");
  el.dataset.title = task.title.toLowerCase();
  el.dataset.description = task.description.toLowerCase();
  el.innerHTML = `
    <div class="card-label-${task.category === "Technical task" ? "technical-task" : "user-story"} padding-left">
      <h4>${task.category === "Technical task" ? "Technical Task" : "User Story"}</h4>
      <img src="../img/drag-drop-icon.png" alt="drag-and-drop-icon" class="drag-drop-icon">
    </div>
    <div><h5 class="card-label-user-story-h5 padding-left">${task.title}</h5></div>
    <div><h6 class="card-label-user-story-h6 padding-left">${task.description}</h6></div>
    <div class="task-progress">
      <div class="progress-main-container">
        <div class="progress-container">
          <div class="progress-bar" style="width: ${progress}%;"></div>
        </div>
      </div>
      <span class="progress-text">${completed} / ${total} tasks</span>
    </div>
    <div class="card-footer">
      <div class="padding-left profile-badge-container">
        ${task.users ? task.users.map(u => `<div class="profile-badge-floating-${u.color}">${u.initials}</div>`).join("") : ""}
      </div>
      <div class="priority-container-img">
        <img src="${taskPriority}" alt="Priority" onerror="this.src='../img/priority-img/medium.png'" class="priority-container-img">
      </div>
    </div>`;
  return el;
}

/**
 * Generates all task elements and inserts them into their respective columns.
 * Also sets up event listeners for modal, drag & drop, and dropdown.
 * @param {Array<Object>} tasksData - Array of task data.
 */
function generateTasks(tasksData) {
  tasksData.forEach(task => {
    if (!task || !task.title || !task.column) return;
    const taskEl = createTaskElement(task);
    const col = document.getElementById(task.column);
    if (col) col.appendChild(taskEl);
    taskEl.addEventListener("click", () => openTaskModal(task));
    taskEl.addEventListener("dragend", async function () {
      const newCol = taskEl.closest(".task-board-container")?.id;
      if (newCol) await updateTaskColumnInFirebase(taskEl.id, newCol);
    });
    const ddIcon = taskEl.querySelector('.drag-drop-icon');
    if (ddIcon) {
      ddIcon.addEventListener("click", function(e) {
        e.stopPropagation();
        let dd = taskEl.querySelector(".move-to-dropdown");
        if (dd) dd.classList.toggle("visible");
        else {
          dd = document.createElement("div");
          dd.classList.add("move-to-dropdown");
          dd.innerHTML = `
            <div class="dropdown-header">Move To</div>
            <div class="dropdown-option" data-status="toDoColumn">To do</div>
            <div class="dropdown-option" data-status="inProgress">In Progress</div>
            <div class="dropdown-option" data-status="awaitFeedback">Await Feedback</div>
            <div class="dropdown-option" data-status="done">Done</div>
          `;
          taskEl.appendChild(dd);
          dd.classList.add("visible");
          dd.querySelectorAll(".dropdown-option").forEach(option => {
            option.addEventListener("click", async function(ev) {
              ev.stopPropagation();
              const ns = option.dataset.status;
              await updateTaskColumnInFirebase(taskEl.id, ns);
              const newCol = document.getElementById(ns);
              if (newCol) newCol.appendChild(taskEl);
              dd.classList.remove("visible");
              checkColumns();
            });
          });
        }
      });
    }
  })
  checkColumns();
}

// ------------------------------
// EXPORTS
// ------------------------------
export {
  generateTasks,
  openTaskModal,
  updateTaskColumnInFirebase,
  updateSubtaskStatus,
  getPriorityLabel,
  checkColumns,
  enableDragAndDrop
};
