import os
import zipfile

def create_bundle_zip():
  dist_dir = 'dist'
  output_zip = 'public/budget-pro-web-bundle.zip'
  
  if not os.path.exists(dist_dir):
    print(f"Error: {dist_dir} does not exist. Run 'npm run build' first.")
    return

  os.makedirs('public', exist_ok=True)
  
  with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, _, files in os.walk(dist_dir):
      for file in files:
        if file.endswith('.zip'):
          continue
        full_path = os.path.join(root, file)
        arcname = os.path.relpath(full_path, dist_dir)
        zipf.write(full_path, arcname)
        
  print(f"Successfully generated {output_zip} ({os.path.getsize(output_zip)} bytes)")

if __name__ == '__main__':
  create_bundle_zip()
