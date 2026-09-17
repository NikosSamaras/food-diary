"""
Μοντελοποίηση ρεαλιστικών φαγητών στο Blender και εξαγωγή σε GLB.

Τρέξιμο:  python3 tools/make_food.py
Αποτέλεσμα: assets/food.glb  (φορτώνεται από το plate3d.js)

Κρατάμε χαμηλό αριθμό πολυγώνων (smooth shading + σωστά normals δίνουν
τον ρεαλισμό, όχι το πλήθος τριγώνων) ώστε το αρχείο να μένει ελαφρύ
για τα κινητά.
"""
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "food.glb")


# ----------------------------------------------------------------- helpers

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def srgb(r, g, b):
    """Χρώμα όπως το βλέπει το μάτι (0-255) → γραμμικό, που περιμένει το Blender."""
    def to_linear(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (to_linear(r), to_linear(g), to_linear(b))


def material(name, rgb, roughness=0.5, metallic=0.0, ior=1.45):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if "IOR" in bsdf.inputs:
        bsdf.inputs["IOR"].default_value = ior
    return mat


def finish(obj, mat, subsurf=2, smooth=True):
    obj.data.materials.append(mat)
    if subsurf:
        m = obj.modifiers.new("subsurf", "SUBSURF")
        m.levels = subsurf
        m.render_levels = subsurf
    if smooth:
        for poly in obj.data.polygons:
            poly.use_smooth = True
    return obj


def jitter(obj, amount=0.02, seed=1):
    """Μικρές ανωμαλίες ώστε τίποτα να μην φαίνεται «τέλειο»/ψεύτικο."""
    import random
    rng = random.Random(seed)
    me = obj.data
    for v in me.vertices:
        n = v.normal
        d = (rng.random() - 0.5) * 2 * amount
        v.co += Vector((n.x * d, n.y * d, n.z * d))


def apply_all(obj):
    bpy.context.view_layer.objects.active = obj
    for m in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


# ----------------------------------------------------------------- models

def make_tomato():
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.5)
    o = bpy.context.object
    o.name = "tomato"
    o.scale = (1.0, 1.0, 0.82)
    bpy.ops.object.transform_apply(scale=True)
    # ελαφριά «λακκούβα» στην κορυφή, εκεί που ήταν το κοτσάνι
    me = o.data
    for v in me.vertices:
        if v.co.z > 0.30:
            v.co.z -= (v.co.z - 0.30) * 0.55
    jitter(o, 0.012, seed=3)
    finish(o, material("m_tomato", srgb(206, 42, 34), roughness=0.24), subsurf=1)
    apply_all(o)

    # κοτσάνι: πέντε μικρά φυλλαράκια
    leaves = []
    for i in range(5):
        a = i * (2 * math.pi / 5)
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.07, radius2=0.0, depth=0.20)
        L = bpy.context.object
        L.rotation_euler = (math.radians(68), 0, a)
        L.location = (math.cos(a) * 0.14, math.sin(a) * 0.14, 0.34)
        leaves.append(L)
    for L in leaves:
        finish(L, material("m_stem", srgb(58, 94, 32), roughness=0.62), subsurf=1)
        apply_all(L)
    return join([o] + leaves, "tomato")


def make_broccoli():
    parts = []
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.15, radius2=0.20, depth=0.42)
    stem = bpy.context.object
    stem.location = (0, 0, -0.10)
    finish(stem, material("m_brocstem", srgb(150, 176, 110), roughness=0.66), subsurf=1)
    apply_all(stem)
    parts.append(stem)

    # κεφάλι από συστάδες μικρών σφαιρών
    import random
    rng = random.Random(7)
    head_mat = material("m_broccoli", srgb(54, 100, 42), roughness=0.78)
    for i in range(9):
        a = rng.random() * 2 * math.pi
        r = 0.10 + rng.random() * 0.20
        z = 0.14 + rng.random() * 0.17
        s = 0.11 + rng.random() * 0.09
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=s)
        b = bpy.context.object
        b.location = (math.cos(a) * r, math.sin(a) * r, z)
        jitter(b, 0.022, seed=i + 11)
        finish(b, head_mat, subsurf=0)
        parts.append(b)
    return join(parts, "broccoli")


def make_carrot():
    bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=0.17, radius2=0.035, depth=0.95)
    o = bpy.context.object
    o.name = "carrot"
    o.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    # ελαφρύ λύγισμα για φυσικότητα
    me = o.data
    for v in me.vertices:
        v.co.z += (v.co.y ** 2) * 0.10
    jitter(o, 0.010, seed=5)
    finish(o, material("m_carrot", srgb(230, 122, 30), roughness=0.44), subsurf=1)
    apply_all(o)
    return o


def make_lettuce():
    """Φύλλο σαλάτας: κυματιστό πλέγμα."""
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=10, y_subdivisions=10, size=0.9)
    o = bpy.context.object
    o.name = "lettuce"
    me = o.data
    for v in me.vertices:
        x, y = v.co.x, v.co.y
        r = math.hypot(x, y)
        v.co.z += math.sin(x * 9.0) * 0.045 + math.cos(y * 7.5) * 0.04 + r * r * 0.55
    solid = o.modifiers.new("solid", "SOLIDIFY")
    solid.thickness = 0.018
    finish(o, material("m_lettuce", srgb(108, 166, 62), roughness=0.52), subsurf=1)
    apply_all(o)
    return o


def make_salmon():
    """Φιλέτο σολομού: επίμηκες, με λοξή κόψη."""
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    o = bpy.context.object
    o.name = "salmon"
    o.scale = (0.62, 0.30, 0.16)
    bpy.ops.object.transform_apply(scale=True)
    me = o.data
    for v in me.vertices:
        t = (v.co.x + 0.62) / 1.24           # 0 στην ουρά → 1 στο χοντρό άκρο
        taper = 0.45 + 0.55 * t
        v.co.y *= taper
        v.co.z *= 0.55 + 0.45 * t
        v.co.z += 0.02 * math.sin(t * math.pi)
    bevel = o.modifiers.new("bevel", "BEVEL")
    bevel.width = 0.05
    bevel.segments = 3
    finish(o, material("m_salmon", srgb(233, 126, 94), roughness=0.38), subsurf=2)
    apply_all(o)
    jitter(o, 0.006, seed=9)
    return o


def make_egg():
    """Αυγό μάτι: ακανόνιστο ασπράδι + θολωτός κρόκος."""
    import random
    rng = random.Random(13)
    bpy.ops.mesh.primitive_circle_add(vertices=28, radius=0.52, fill_type="NGON")
    white = bpy.context.object
    white.name = "egg"
    me = white.data
    for v in me.vertices:
        if v.co.length > 0.01:
            v.co *= 0.82 + rng.random() * 0.34      # κυματιστό περίγραμμα
            v.co.z += 0.012
    solid = white.modifiers.new("solid", "SOLIDIFY")
    solid.thickness = 0.055
    solid.offset = 0
    finish(white, material("m_white", srgb(250, 248, 240), roughness=0.32), subsurf=1)
    apply_all(white)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.20)
    yolk = bpy.context.object
    yolk.scale = (1, 1, 0.62)
    yolk.location = (0.02, -0.01, 0.06)
    bpy.ops.object.transform_apply(scale=True)
    finish(yolk, material("m_yolk", srgb(240, 168, 30), roughness=0.30), subsurf=1)
    apply_all(yolk)
    return join([white, yolk], "egg")


def make_bread():
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=13, radius=0.45)
    o = bpy.context.object
    o.name = "bread"
    o.scale = (1.18, 0.86, 0.66)
    bpy.ops.object.transform_apply(scale=True)
    me = o.data
    # η βάση επίπεδη, όπως ακουμπάει στο ταψί
    for v in me.vertices:
        if v.co.z < -0.16:
            v.co.z = -0.16 + (v.co.z + 0.16) * 0.28
    # χαρακιά στην κορυφή
    for v in me.vertices:
        if v.co.z > 0.12 and abs(v.co.y) < 0.09:
            v.co.z -= (0.09 - abs(v.co.y)) * 0.55
    jitter(o, 0.014, seed=21)
    finish(o, material("m_bread", srgb(176, 120, 58), roughness=0.74), subsurf=1)
    apply_all(o)
    return o


def make_almond():
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=9, radius=0.20)
    o = bpy.context.object
    o.name = "almond"
    o.scale = (0.62, 1.0, 0.42)
    bpy.ops.object.transform_apply(scale=True)
    me = o.data
    for v in me.vertices:
        t = (v.co.y + 0.20) / 0.40
        v.co.x *= 0.55 + 0.45 * t              # μυτερό στο ένα άκρο
        v.co.z *= 0.60 + 0.40 * t
    finish(o, material("m_almond", srgb(204, 168, 122), roughness=0.46), subsurf=1)
    apply_all(o)
    return o


# ----------------------------------------------------------------- assembly

def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    out = bpy.context.object
    out.name = name
    return out


def main():
    reset_scene()
    builders = [make_tomato, make_broccoli, make_carrot, make_lettuce,
                make_salmon, make_egg, make_bread, make_almond]

    made = []
    for i, fn in enumerate(builders):
        obj = fn()
        # τα τοποθετούμε σε σειρά· η τελική θέση ορίζεται από το three.js
        obj.location = (i * 3.0, 0, 0)
        made.append(obj)

    tris = 0
    for o in made:
        o.data.calc_loop_triangles()
        tris += len(o.data.loop_triangles)
    print("ΜΟΝΤΕΛΑ:", ", ".join(o.name for o in made))
    print("ΣΥΝΟΛΟ ΤΡΙΓΩΝΩΝ:", tris)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_normals=True,
        export_texcoords=False,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )
    print("ΕΞΑΓΩΓΗ:", OUT, os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    main()
