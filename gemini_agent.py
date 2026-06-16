import vertexai
from vertexai.generative_models import GenerativeModel

# Konfigurasi Proyek Google Cloud Anda
PROJECT_ID = "my-vscode-gemini-476205" 
LOCATION = "us-central1" 

def jalankan_agen():
    print("Mempersiapkan Gemini Agent...\n")
    
    # Inisialisasi Vertex AI menggunakan kredensial default sistem Mac Anda
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    
    # Memuat model Gemini 1.5 Flash 
    model = GenerativeModel("gemini-1.5-flash-001")
    chat = model.start_chat()
    
    print("================================")
    print("       GEMINI AGENT AKTIF       ")
    print("================================")
    print("Ketik 'keluar' untuk menghentikan program.\n")
    
    while True:
        prompt = input("Anda   : ")
        
        if prompt.lower() in ['keluar', 'exit', 'quit']:
            print("Sistem : Gemini Agent dimatikan. Sampai jumpa!")
            break
            
        try:
            # Mengirim pesan ke AI dan mencetak responsnya
            response = chat.send_message(prompt)
            print(f"Gemini : {response.text}\n")
        except Exception as e:
            print(f"Sistem : Terjadi kesalahan: {e}\n")

if __name__ == "__main__":
    jalankan_agen()