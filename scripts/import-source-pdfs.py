# Compatibility entry point: the curriculum now imports every bundled PDF and PPT source.
exec((__import__('pathlib').Path(__file__).with_name('import-all-materials.py')).read_text(encoding='utf-8'), globals())
