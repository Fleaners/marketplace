const { listProducts, getProductById, createProduct, updateProduct, deleteProduct, updateStock } = require('../models/productModel');
const { uploadImage } = require('../utils/cloudinaryUpload');

const demoProducts = [
  {
    id: 1,
    name: 'Demo Product 1',
    description: 'Served by backend fallback while database is unavailable.',
  },
  {
    id: 2,
    name: 'Demo Product 2',
    description: 'Connect PostgreSQL to switch from demo fallback to live inventory.',
  },
  {
    id: 3,
    name: 'Demo Product 3',
    description: 'Backend is online and ready for production database setup.',
  },
];

async function fetchProducts(req, res, next) {
  try {
    const { business_id, search, city, limit, offset } = req.query;
    const products = await listProducts({
      business_id: business_id ? parseInt(business_id, 10) : undefined,
      search,
      city,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json(products);
  } catch (error) {
    if (process.env.ALLOW_DEMO_FALLBACK === 'true') {
      return res.json(demoProducts);
    }
    next(error);
  }
}

async function addProduct(req, res, next) {
  try {
    const { name, price, cost_price, stock } = req.body;
    const productImage = req.file;
    const image_url = productImage ? await uploadImage(productImage, 'marketplace-store/products') : null;
    const product = await createProduct({
      business_id: req.business.id,
      name,
      price: parseFloat(price),
      cost_price: parseFloat(cost_price),
      stock: parseInt(stock, 10) || 0,
      image_url,
    });
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
}

async function modifyProduct(req, res, next) {
  try {
    const productId = parseInt(req.params.id, 10);
    const fields = {};
    const allowed = ['name', 'price', 'cost_price', 'stock'];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        fields[key] = req.body[key];
      }
    });

    if (req.file) {
      fields.image_url = await uploadImage(req.file, 'marketplace-store/products');
    }

    const updated = await updateProduct(productId, req.business.id, fields);
    if (!updated) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

async function removeProduct(req, res, next) {
  try {
    const productId = parseInt(req.params.id, 10);
    const deleted = await deleteProduct(productId, req.business.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

async function modifyStock(req, res, next) {
  try {
    const productId = parseInt(req.params.id, 10);
    const { stock } = req.body;
    const updated = await updateStock(productId, req.business.id, parseInt(stock, 10));
    if (!updated) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

module.exports = { fetchProducts, addProduct, modifyProduct, removeProduct, modifyStock };
