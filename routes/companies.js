const express = require("express")
const router = new express.Router()
const ExpressError = require("../expressError")
const db = require("../db")
const slugify = require('slugify')

router.get("/", async function (req, res) {
  const result = await db.query("SELECT code, name FROM companies;");
  return res.json({ companies: result.rows })
})

router.get('/:code', async function (req, res, next) {
  try {

    let reqCode = req.params.code
    const resultCompany = await db.query(
      'SELECT code, name, description FROM companies WHERE code=$1;',
      [reqCode]);
    if (resultCompany.rows.length === 0) {
      throw new ExpressError('Company code does not exist', 404)
    }
    const resultInvoices = await db.query(
      'SELECT id, amt, paid, add_date, paid_date FROM invoices JOIN companies ON comp_code=code WHERE comp_code=$1',
      [req.params.code]
    );
    const responseCompany = resultCompany.rows[0];
    responseCompany.invoices = resultInvoices.rows;
    return res.json({ company: responseCompany });

  } catch (err) {
    return next(err);
  }
})

router.post("/", async function (req, res, next) {
  try {

    if (!req.body.code || !req.body.name) {
      throw new ExpressError('Company code and name are required.', 404)
    }
    const result = await db.query(
      "INSERT INTO companies (code, name, description) VALUES ($1, $2, $3) RETURNING code, name, description ",
      [slugify(req.body.code), req.body.name, req.body.description]
    );
    return res.json({ company: result.rows[0] });

  } catch (err) {
    return next(err);
  }
})

router.put('/:code', async function (req, res, next) {
  try {

    if (!req.params.code || !req.body.name) {
      throw new ExpressError('Company code and name are required.', 404);
    }
    const result = await db.query(
      'UPDATE companies SET name=$1, description=$2 WHERE code=$3 RETURNING code, name, description',
      [req.body.name, req.body.description, req.params.code]
    );
    if (result.rows.length === 0) {
      throw new ExpressError("Company code doesn't exist", 404);
    }
    return res.json({ company: result.rows[0] });

  } catch (err) {
    return next(err);
  }
})

router.delete("/:code", async function (req, res, next) {
  try {

    const result = await db.query(
      "DELETE FROM companies WHERE code = $1 RETURNING code", [req.params.code]
    );
    if (result.rows.length === 0) {
      throw new ExpressError("Company code doesn't exist", 404);
    }
    return res.json({ status: "deleted" });

  } catch (err) {
    return next(err);
  }
})

module.exports = router;
