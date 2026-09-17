import test from 'node:test'
import assert from 'node:assert/strict'
import { getCategoryStatGroup } from '../src/utils/statCategory.js'

const parentCategory = {
  id: 'food',
  name: '餐饮',
  icon: '🍔',
  children: [
    { id: 'breakfast', name: '早餐', icon: '🍞' }
  ]
}

test('groups bills with an existing child category under that child', () => {
  assert.deepEqual(
    getCategoryStatGroup({ categoryId: 'breakfast' }, parentCategory),
    {
      id: 'breakfast',
      name: '早餐',
      icon: '🍞',
      isOther: false
    }
  )
})

test('groups bills without a child category under the parent category', () => {
  assert.deepEqual(
    getCategoryStatGroup({ categoryId: 'food' }, parentCategory),
    {
      id: 'other',
      name: '餐饮',
      icon: '🍔',
      isOther: true
    }
  )
  assert.deepEqual(
    getCategoryStatGroup({}, parentCategory),
    {
      id: 'other',
      name: '餐饮',
      icon: '🍔',
      isOther: true
    }
  )
})

test('groups bills whose child category was deleted under the parent category', () => {
  assert.deepEqual(
    getCategoryStatGroup({ categoryId: 'deleted-child' }, parentCategory),
    {
      id: 'other',
      name: '餐饮',
      icon: '🍔',
      isOther: true
    }
  )
})
