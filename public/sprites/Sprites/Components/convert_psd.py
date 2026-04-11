import os
import sys
from psd_tools import PSDImage
from PIL import Image

def convert_psd_to_png(root_directory):
    """
    Рекурсивно находит все .psd файлы в указанной директории
    и сохраняет их копии в формате .png в тех же папках.
    """
    psd_files_found = []
    # Шаг 1: Найти все PSD файлы
    print(f"Поиск .psd файлов в директории: {os.path.abspath(root_directory)}")
    for root, _, files in os.walk(root_directory):
        for file in files:
            if file.lower().endswith('.psd'):
                psd_files_found.append(os.path.join(root, file))

    if not psd_files_found:
        print("PSD файлы не найдены.")
        return

    print(f"Найдено {len(psd_files_found)} файлов. Начинаю конвертацию...")
    converted_count = 0

    # Шаг 2: Конвертировать каждый файл
    for psd_path in psd_files_found:
        # Формируем имя для PNG файла
        png_path = os.path.splitext(psd_path)[0] + '.png'
        
        try:
            print(f"  -> Конвертирую '{os.path.basename(psd_path)}'...", end='')
            
            # Открываем PSD файл
            psd = PSDImage.open(psd_path)
            
            # Объединяем все слои в одно изображение
            merged_image = psd.composite()
            
            # Сохраняем как PNG
            merged_image.save(png_path)
            
            print(" Готово.")
            converted_count += 1
        except Exception as e:
            print(f" ОШИБКА: Не удалось обработать файл. Причина: {e}")

    print(f"\nКонвертация завершена. Успешно сохранено {converted_count} PNG файлов.")


if __name__ == "__main__":
    # Если путь передан как аргумент командной строки
    if len(sys.argv) > 1:
        target_dir = sys.argv[1]
    else:
        # Если нет, используем текущую директорию
        target_dir = '.'
    
    # Проверяем, существует ли директория
    if not os.path.isdir(target_dir):
        print(f"Ошибка: Директория '{target_dir}' не найдена.")
    else:
        convert_psd_to_png(target_dir)