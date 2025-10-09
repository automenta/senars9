use super::*;
use crate::{
    data_structures::term_type::TermType, memory::Memory, parser, reasoning::Reasoner,
};

#[test]
fn test_run_single_cycle() {
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();
    let selector = FocusSetSelector::default();
    let context = CycleContext { current_time: 100 };

    // Setup premises for a syllogism, now WITH truth values.
    let premise1 = parser::parse("(cat --> mammal). %1.0;0.9%", 1).unwrap();
    premise1.set_priority(0.9); // High priority to ensure it's selected
    memory.add_task(premise1, 1);

    let premise2 = parser::parse("(mammal --> animal). %1.0;0.8%", 2).unwrap();
    premise2.set_priority(0.9); // High priority to ensure it's selected
    memory.add_task(premise2, 2);

    // Add a low-priority task that should not be selected.
    let low_priority_task = parser::parse("distraction.", 3).unwrap();
    low_priority_task.set_priority(0.1);
    memory.add_task(low_priority_task, 3);

    // Run the single, stateless cycle function.
    run_single_cycle(&mut memory, &reasoner, &selector, &context);

    // After the cycle, the conclusion (cat --> animal) should be in memory.
    let cat_concept = memory.create_or_get_atom_concept("cat", 0);
    let animal_concept = memory.create_or_get_atom_concept("animal", 0);
    let conclusion_concept = memory.create_or_get_compound_concept(
        TermType::Inheritance,
        vec![cat_concept, animal_concept],
        0,
    );

    let conclusion_from_mem = memory.get_task(&conclusion_concept.term.hash);

    // 1. Assert that the derived conclusion is now in memory.
    assert!(
        conclusion_from_mem.is_some(),
        "The derived conclusion should be in memory after the cycle."
    );

    // 2. Assert that the new task has the correct timestamp from the cycle's context.
    let derived_task = conclusion_from_mem.unwrap();
    assert_eq!(derived_task.created_at, context.current_time);
    assert_eq!(derived_task.occurrence_time, Some(context.current_time));
}

#[test]
fn test_select_focus_set_logic() {
    const FOCUS_SET_SIZE: usize = 5;
    let mut memory = Memory::new();
    let selector = FocusSetSelector {
        max_size: FOCUS_SET_SIZE,
        ..Default::default()
    };
    let current_time = (FOCUS_SET_SIZE + 5) as u64;

    // Create more tasks than the FOCUS_SET_SIZE, with varying priorities.
    for i in 0..(FOCUS_SET_SIZE + 5) {
        let task = parser::parse(&format!("task{}.", i), i as u64).unwrap();
        // Assign priority in ascending order.
        task.set_priority((i as f32) / 10.0);
        memory.add_task(task, i as u64);
    }

    let all_tasks: Vec<_> = memory.get_all_tasks_iter().cloned().collect();
    let focus_set = selector.select(&all_tasks, current_time);

    assert_eq!(focus_set.len(), FOCUS_SET_SIZE);
    let highest_priority_task_name = format!("task{}", FOCUS_SET_SIZE + 4);
    assert_eq!(focus_set[0].term().name, highest_priority_task_name);
    assert!(focus_set[0].get_priority() > focus_set[1].get_priority());
}