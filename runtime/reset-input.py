"""Release held input on the fixed guest X11 display; emit no key values."""
import ctypes as c
import sys


def release_input():
    x11 = c.CDLL('libX11.so.6')
    xtest = c.CDLL('libXtst.so.6')
    x11.XOpenDisplay.argtypes = [c.c_char_p]
    x11.XOpenDisplay.restype = c.c_void_p
    x11.XQueryKeymap.argtypes = [c.c_void_p, c.c_char_p]
    x11.XDefaultRootWindow.argtypes = [c.c_void_p]
    x11.XDefaultRootWindow.restype = c.c_ulong
    x11.XQueryPointer.argtypes = [c.c_void_p, c.c_ulong,
                                c.POINTER(c.c_ulong), c.POINTER(c.c_ulong),
                                c.POINTER(c.c_int), c.POINTER(c.c_int),
                                c.POINTER(c.c_int), c.POINTER(c.c_int),
                                c.POINTER(c.c_uint)]
    x11.XSync.argtypes = [c.c_void_p, c.c_int]
    x11.XCloseDisplay.argtypes = [c.c_void_p]
    xtest.XTestFakeKeyEvent.argtypes = [c.c_void_p, c.c_uint, c.c_int, c.c_ulong]
    xtest.XTestFakeButtonEvent.argtypes = [c.c_void_p, c.c_uint, c.c_int, c.c_ulong]
    display = x11.XOpenDisplay(b':1')
    if not display:
        return 1
    try:
        keys = c.create_string_buffer(32)
        if not x11.XQueryKeymap(display, keys):
            return 1
        for code in range(8, 256):
            if keys.raw[code // 8] & (1 << (code % 8)):
                if not xtest.XTestFakeKeyEvent(display, code, 0, 0):
                    return 1
        for button in range(1, 8):
            if not xtest.XTestFakeButtonEvent(display, button, 0, 0):
                return 1
        x11.XSync(display, 0)
        if not x11.XQueryKeymap(display, keys):
            return 1
        root, child = c.c_ulong(), c.c_ulong()
        rx, ry, wx, wy = c.c_int(), c.c_int(), c.c_int(), c.c_int()
        mask = c.c_uint()
        if not x11.XQueryPointer(display, x11.XDefaultRootWindow(display),
                                 c.byref(root), c.byref(child), c.byref(rx),
                                 c.byref(ry), c.byref(wx), c.byref(wy), c.byref(mask)):
            return 1
        return int(any(keys.raw) or bool(mask.value & (31 << 8)))
    finally:
        x11.XCloseDisplay(display)


if __name__ == '__main__':
    sys.exit(release_input() if len(sys.argv) == 1 else 1)
