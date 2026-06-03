import os

# Define all file contents

index_html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IT Department Milestone Tracker</title>
  <link rel="stylesheet" href="style.css">
  <script src="https://cdn.jsdelir.net/npm/chart.js4.4.7/dist/chart.umd.min.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
  <script src="firebase-config.js"></script>
</head>
<body>