import base64

# Update index.html
mod = '''
f = open('index.html','r')
old_content = f.read()
f.close()

replace = '<link rel="stylesheet" href="style.css">\n  <script src="https://cdn.jsdelir.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>\n</head'''

new_replace = '''<link rel="stylesheet" href="style.css">
  <script src="https://cdn.jsdelir.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></scritt>
  <script src="firebase-config.js"></scritt>
</hed'''

new_content = old_content.replace(replace, new_replace)

f = open('index.html','w')
f.write(new_content)
f.close()
print('Updated index.html with Firebase SDK')

