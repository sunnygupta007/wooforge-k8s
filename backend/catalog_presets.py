"""Sample product catalog presets for WooCommerce store provisioning."""

CATALOG_PRESETS = {
    "electronics": {
        "name": "Electronics & Gadgets",
        "description": "Smartphones, noise-canceling headphones, smart watches, and accessories.",
        "products": [
            {
                "name": "Aura Pro Wireless Noise-Canceling Headphones",
                "price": "199.99",
                "regular_price": "249.99",
                "description": "Premium wireless headphones with active noise cancellation and 40h battery life.",
                "category": "Audio",
                "sku": "AURA-PRO-NC"
            },
            {
                "name": "Vortex Smartwatch Series 6",
                "price": "149.50",
                "regular_price": "149.50",
                "description": "Fitness tracking smartwatch with heart-rate monitor, GPS, and AMOLED display.",
                "category": "Wearables",
                "sku": "VORTEX-SW6"
            },
            {
                "name": "HyperCharge 65W GaN Fast Charger",
                "price": "39.99",
                "regular_price": "49.99",
                "description": "Ultra-compact Gallium Nitride wall charger with dual USB-C and USB-A ports.",
                "category": "Accessories",
                "sku": "GAN-65W"
            },
            {
                "name": "Quantum Ergo Mechanical Keyboard",
                "price": "129.00",
                "regular_price": "129.00",
                "description": "Hot-swappable mechanical keyboard with RGB backlighting and PBT keycaps.",
                "category": "Peripherals",
                "sku": "MECH-Q-RGB"
            }
        ]
    },
    "fashion": {
        "name": "Apparel & Streetwear",
        "description": "Minimalist hoodies, eco-cotton tees, denim jackets, and canvas sneakers.",
        "products": [
            {
                "name": "Heavyweight Organic Cotton Hoodie - Onyx",
                "price": "68.00",
                "regular_price": "68.00",
                "description": "450 GSM French Terry cotton hoodie with custom relaxed fit and double-lined hood.",
                "category": "Hoodies",
                "sku": "HW-HD-BLK"
            },
            {
                "name": "Raw Indigo Selvedge Denim Jacket",
                "price": "120.00",
                "regular_price": "145.00",
                "description": "14oz Japanese selvedge denim jacket with custom brass hardware and timeless cut.",
                "category": "Outerwear",
                "sku": "SLV-JKT-IND"
            },
            {
                "name": "Essential Vintage Wash Tee - Bone White",
                "price": "32.00",
                "regular_price": "32.00",
                "description": "Garment-dyed single jersey cotton tee with ribbed collar and relaxed drop shoulder.",
                "category": "T-Shirts",
                "sku": "VNT-TEE-WHT"
            }
        ]
    },
    "coffee_shop": {
        "name": "Artisan Coffee Roasters",
        "description": "Specialty single-origin beans, pour-over gear, and cold brew accessories.",
        "products": [
            {
                "name": "Ethiopia Yirgacheffe Washed - 250g",
                "price": "18.50",
                "regular_price": "18.50",
                "description": "Floral jasmine notes with bergamot and delicate peach finish. Light roast.",
                "category": "Single Origin",
                "sku": "BEANS-ETH-250"
            },
            {
                "name": "Precision Conical Burr Hand Grinder",
                "price": "64.00",
                "regular_price": "75.00",
                "description": "CNC machined stainless steel burrs with 30 click adjustment steps for pour-over and espresso.",
                "category": "Brewing Gear",
                "sku": "GRINDER-CONIC"
            },
            {
                "name": "Double-Wall Insulated Travel Tumbler 16oz",
                "price": "26.00",
                "regular_price": "26.00",
                "description": "Ceramic-lined vacuum insulated travel mug keeps drinks hot for 6 hours.",
                "category": "Drinkware",
                "sku": "TUMBLER-16"
            }
        ]
    },
    "minimal": {
        "name": "Clean Starter Store",
        "description": "Single sample product to verify checkout and payment workflows.",
        "products": [
            {
                "name": "Demo Welcome Product",
                "price": "19.99",
                "regular_price": "19.99",
                "description": "Welcome to your on-demand WooCommerce store! This is a demo starter product.",
                "category": "General",
                "sku": "DEMO-001"
            }
        ]
    }
}

def generate_wp_catalog_cli_commands(preset_key: str = "electronics") -> str:
    """Generate shell script commands using wp-cli to import the selected catalog."""
    catalog = CATALOG_PRESETS.get(preset_key, CATALOG_PRESETS["electronics"])
    commands = [f"# Seeding Catalog Preset: {catalog['name']}"]
    
    # PHP script snippet executed via `wp eval` for 100% reliable WC Product creation
    # without needing WC REST API keys or external credentials!
    php_code = [
        "if (class_exists('WC_Product_Simple')) {",
    ]
    for item in catalog["products"]:
        name = item["name"].replace("'", "\\'")
        desc = item["description"].replace("'", "\\'")
        price = item["price"]
        reg_price = item["regular_price"]
        sku = item["sku"]
        
        php_code.append(f"""
            $p = new WC_Product_Simple();
            $p->set_name('{name}');
            $p->set_status('publish');
            $p->set_regular_price('{reg_price}');
            $p->set_price('{price}');
            $p->set_description('{desc}');
            $p->set_short_description('{desc}');
            $p->set_sku('{sku}');
            $p->set_manage_stock(true);
            $p->set_stock_quantity(50);
            $p->set_stock_status('instock');
            $p->save();
        """)
    php_code.append("echo 'All preset products seeded successfully!\\n';")
    php_code.append("}")
    
    compact_php = " ".join(line.strip() for line in php_code if line.strip())
    escaped_php = compact_php.replace('"', '\\"')
    commands.append(f'wp eval "{escaped_php}" --allow-root')
    
    return "\n".join(commands)
