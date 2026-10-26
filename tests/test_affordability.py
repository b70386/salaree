import os
import tempfile
import unittest
from pathlib import Path
os.environ['SALAREE_DB'] = str(Path(tempfile.gettempdir()) / 'salaree-test.db')
import app as salaree

class SalareeCalculationTests(unittest.TestCase):
    def setUp(self):
        self.dataset = salaree.load_dataset()
        self.region = self.dataset['regions'][0]
    def test_single_person_cost_is_sum_of_commodity_costs(self):
        result = salaree.calculate(self.region, people=1)
        self.assertEqual(result['basket_cost'], sum(item['cost'] for item in result['items']))
    def test_ratio_and_remaining_are_consistent(self):
        result = salaree.calculate(self.region, people=1)
        self.assertEqual(result['ratio_percent'], round(result['basket_cost'] / result['monthly_wage'] * 100, 1))
        self.assertEqual(result['remaining'], result['monthly_wage'] - result['basket_cost'])
    def test_family_size_scales_quantity(self):
        one = salaree.calculate(self.region, people=1)
        two = salaree.calculate(self.region, people=2)
        self.assertEqual(two['basket_cost'], one['basket_cost'] * 2)
    def test_custom_wage_changes_ratio_not_basket_cost(self):
        baseline = salaree.calculate(self.region, people=1)
        custom = salaree.calculate(self.region, people=1, wage=baseline['monthly_wage'] * 2)
        self.assertEqual(custom['basket_cost'], baseline['basket_cost'])
        self.assertEqual(custom['ratio_percent'], round(baseline['ratio_percent'] / 2, 1))
    def test_dataset_is_explicitly_demo(self):
        self.assertTrue(self.dataset['metadata']['is_demo'])
        self.assertEqual(self.dataset['metadata']['dataset_status'], 'DEMO')

class SalareeApiTests(unittest.TestCase):
    def setUp(self):
        self.client = salaree.app.test_client()
    def test_health(self):
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['status'], 'ok')
    def test_region_not_found(self):
        self.assertEqual(self.client.get('/api/regions/not-a-region').status_code, 404)
    def test_calculation_rejects_nonpositive_wage(self):
        region_id = salaree.load_dataset()['regions'][0]['id']
        response = self.client.post('/api/calculate', json={'region_id':region_id,'wage':0,'people':1})
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()
